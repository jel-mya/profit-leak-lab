import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Fictional identities. Only auth.uid() and auth.users are shimmed; PostgreSQL
// itself executes every migration, grant, trigger and row-level policy.
const owner = '00000000-0000-4000-8000-000000000001';
const editor = '00000000-0000-4000-8000-000000000002';
const viewer = '00000000-0000-4000-8000-000000000003';
const other = '00000000-0000-4000-8000-000000000004';
const outsider = '00000000-0000-4000-8000-000000000005';
const businessA = '10000000-0000-4000-8000-000000000001';
const businessB = '10000000-0000-4000-8000-000000000002';
const actionA = '20000000-0000-4000-8000-000000000001';
const actionB = '20000000-0000-4000-8000-000000000002';

test('PostgreSQL enforces the tenant security contract', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, directory), 'utf8'));
  }
  for (const id of [owner, editor, viewer, other, outsider]) await db.query('insert into auth.users(id) values ($1)', [id]);
  await db.query("insert into public.businesses(id,name,currency) values ($1,'Synthetic A','AUD'),($2,'Synthetic B','USD')", [businessA, businessB]);
  for (const [business, user, role] of [[businessA, owner, 'owner'], [businessA, editor, 'editor'], [businessA, viewer, 'viewer'], [businessB, other, 'owner']]) {
    await db.query('insert into public.memberships values ($1,$2,$3)', [business, user, role]);
  }
  await db.query("insert into public.control_actions(id,business_id,title,created_by) values ($1,$2,'Synthetic A action',$3),($4,$5,'Synthetic B action',$6)", [actionA, businessA, owner, actionB, businessB, other]);

  // Roll back each caller session, including successful writes, to isolate tests.
  async function as(user, fn, role = 'authenticated') {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
      await db.exec(role === 'anon' ? 'set local role anon' : 'set local role authenticated');
      return await fn();
    } finally { await db.exec('rollback'); }
  }
  const denied = promise => assert.rejects(promise, error => error.code === '42501');

  await t.test('anonymous roles have no financial table access', async () => {
    for (const table of ['businesses', 'memberships', 'control_actions']) {
      await denied(as(null, () => db.query(`select * from public.${table}`), 'anon'));
    }
  });
  await t.test('owners only read their own business, action and membership', async () => {
    await as(owner, async () => {
      assert.deepEqual((await db.query('select id from public.businesses')).rows, [{ id: businessA }]);
      assert.deepEqual((await db.query('select id from public.control_actions')).rows, [{ id: actionA }]);
      assert.deepEqual((await db.query('select user_id from public.memberships')).rows, [{ user_id: owner }]);
      assert.deepEqual((await db.query('select * from public.control_actions where id=$1', [actionB])).rows, []);
    });
  });
  await t.test('missing identity and nonmembers see no records', async () => {
    for (const user of [null, outsider]) await as(user, async () => {
      assert.equal((await db.query('select * from public.control_actions')).rows.length, 0);
      assert.equal((await db.query('select * from public.businesses')).rows.length, 0);
    });
  });
  await t.test('editors insert and update own actions with server-derived identity', async () => {
    await as(editor, async () => {
      const { rows } = await db.query("insert into public.control_actions(business_id,title) values ($1,'Synthetic new action') returning created_by", [businessA]);
      assert.equal(rows[0].created_by, editor);
      const updated = await db.query("update public.control_actions set status='Investigating',note='Synthetic evidence' where id=$1 returning status,note", [actionA]);
      assert.deepEqual(updated.rows, [{ status: 'Investigating', note: 'Synthetic evidence' }]);
    });
  });
  await t.test('viewers can read but cannot insert or update', async () => {
    await as(viewer, async () => {
      assert.equal((await db.query('select * from public.control_actions')).rows.length, 1);
      assert.equal((await db.query("update public.control_actions set title='Unauthorized' where id=$1 returning id", [actionA])).rows.length, 0);
    });
    await denied(as(viewer, () => db.query("insert into public.control_actions(business_id,title) values ($1,'Unauthorized')", [businessA])));
  });
  await t.test('foreign-tenant inserts fail and guessed foreign IDs cannot be updated', async () => {
    await denied(as(owner, () => db.query("insert into public.control_actions(business_id,title) values ($1,'Unauthorized')", [businessB])));
    await as(owner, async () => assert.equal((await db.query("update public.control_actions set title='Unauthorized' where id=$1 returning id", [actionB])).rows.length, 0));
  });
  await t.test('caller cannot forge the creator on insert', async () => {
    await denied(as(editor, () => db.query("insert into public.control_actions(business_id,title,created_by) values ($1,'Spoofed',$2)", [businessA, owner])));
  });
  await t.test('tenant, creator, IDs and timestamps are immutable through client grants', async () => {
    for (const [column, value] of [['business_id', businessB], ['created_by', editor], ['id', actionB], ['created_at', '2020-01-01'], ['updated_at', '2020-01-01']]) {
      await denied(as(owner, () => db.query(`update public.control_actions set ${column}=$1 where id=$2`, [value, actionA])));
    }
  });
  await t.test('clients cannot provision businesses, escalate memberships or delete actions', async () => {
    await denied(as(owner, () => db.query("insert into public.businesses(name,currency) values ('Unauthorized','AUD')")));
    await denied(as(viewer, () => db.query("update public.memberships set role='owner' where user_id=$1", [viewer])));
    await denied(as(owner, () => db.query("insert into public.memberships values ($1,$2,'owner')", [businessB, owner])));
    await denied(as(owner, () => db.query('delete from public.control_actions where id=$1', [actionA])));
  });
  await t.test('explicit multi-business membership retains the role of each business', async () => {
    await db.query("insert into public.memberships values ($1,$2,'viewer')", [businessB, owner]);
    try {
      await as(owner, async () => {
        assert.equal((await db.query('select * from public.control_actions')).rows.length, 2);
        assert.equal((await db.query("update public.control_actions set title='Unauthorized' where id=$1 returning id", [actionB])).rows.length, 0);
      });
    } finally { await db.query('delete from public.memberships where business_id=$1 and user_id=$2', [businessB, owner]); }
  });
  await t.test('membership revocation removes access on the next request', async () => {
    await db.query('delete from public.memberships where user_id=$1', [editor]);
    try {
      await as(editor, async () => assert.equal((await db.query('select * from public.control_actions')).rows.length, 0));
      await denied(as(editor, () => db.query("insert into public.control_actions(business_id,title) values ($1,'Unauthorized')", [businessA])));
    } finally { await db.query("insert into public.memberships values ($1,$2,'editor')", [businessA, editor]); }
  });
  await t.test('anonymous callers cannot execute the privileged membership helper', async () => {
    await denied(as(null, () => db.query('select private.can_access_business($1)', [businessA]), 'anon'));
  });
  await t.test('failed writes leave the other tenant unchanged', async () => {
    assert.deepEqual((await db.query('select title,status,note from public.control_actions where id=$1', [actionB])).rows, [{ title: 'Synthetic B action', status: 'Open', note: '' }]);
  });
});
