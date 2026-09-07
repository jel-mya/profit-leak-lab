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
  const migrations = (await readdir(directory)).filter(f => f.endsWith('.sql')).sort();
  await db.exec(await readFile(new URL(migrations[0], directory), 'utf8'));
  for (const id of [owner, editor, viewer, other, outsider]) await db.query('insert into auth.users(id) values ($1)', [id]);
  await db.query("insert into public.businesses(id,name,currency) values ($1,'Synthetic A','AUD'),($2,'Synthetic B','USD')", [businessA, businessB]);
  for (const [business, user, role] of [[businessA, owner, 'owner'], [businessA, editor, 'editor'], [businessA, viewer, 'viewer'], [businessB, other, 'owner']]) {
    await db.query('insert into public.memberships values ($1,$2,$3)', [business, user, role]);
  }
  await db.query("insert into public.control_actions(id,business_id,title,created_by) values ($1,$2,'Synthetic A action',$3),($4,$5,'Synthetic B action',$6)", [actionA, businessA, owner, actionB, businessB, other]);
  // Upgrade a populated database too, so baseline/history backfills are tested.
  for (const file of migrations.slice(1)) await db.exec(await readFile(new URL(file, directory), 'utf8'));

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
  const save = (id = actionA, revision = 1, title = 'Reviewed', status = 'Investigating') =>
    db.query('select * from public.update_control_action($1,$2,$3,$4,$5,$6,$7)', [id, revision, title, '', null, status, 'Synthetic note']);

  await t.test('anonymous roles have no financial table access', async () => {
    for (const table of ['businesses', 'memberships', 'control_actions', 'action_events']) {
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
      const updated = await db.query("select status,note from public.update_control_action($1,1,'Synthetic A action','',null,'Investigating','Synthetic evidence')", [actionA]);
      assert.deepEqual(updated.rows, [{ status: 'Investigating', note: 'Synthetic evidence' }]);
    });
  });
  await t.test('viewers can read but cannot insert or update', async () => {
    await as(viewer, async () => {
      assert.equal((await db.query('select * from public.control_actions')).rows.length, 1);

    });
    await denied(as(viewer, () => db.query("insert into public.control_actions(business_id,title) values ($1,'Unauthorized')", [businessA])));
    await denied(as(viewer, () => save()));
  });
  await t.test('foreign-tenant inserts fail and guessed foreign IDs cannot be updated', async () => {
    await denied(as(owner, () => db.query("insert into public.control_actions(business_id,title) values ($1,'Unauthorized')", [businessB])));
    await denied(as(owner, () => db.query("select public.update_control_action($1,1,'Unauthorized','',null,'Open','')", [actionB])));
  });
  await t.test('caller cannot forge the creator on insert', async () => {
    await denied(as(editor, () => db.query("insert into public.control_actions(business_id,title,created_by) values ($1,'Spoofed',$2)", [businessA, owner])));
  });
  await t.test('tenant, creator, IDs and timestamps are immutable through client grants', async () => {
    for (const [column, value] of [['business_id', businessB], ['created_by', editor], ['id', actionB], ['created_at', '2020-01-01'], ['updated_at', '2020-01-01']]) {
      await denied(as(owner, () => db.query(`update public.control_actions set ${column}=$1 where id=$2`, [value, actionA])));
    }
  });
  await t.test('clients cannot directly provision businesses, escalate memberships or delete actions', async () => {
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

      });
      await denied(as(owner, () => save(actionB)));
    } finally { await db.query('delete from public.memberships where business_id=$1 and user_id=$2', [businessB, owner]); }
  });
  await t.test('membership revocation removes access on the next request', async () => {
    await db.query('delete from public.memberships where user_id=$1', [editor]);
    try {
      await as(editor, async () => assert.equal((await db.query('select * from public.control_actions')).rows.length, 0));
      await denied(as(editor, () => db.query("insert into public.control_actions(business_id,title) values ($1,'Unauthorized')", [businessA])));
      await denied(as(editor, () => save()));
    } finally { await db.query("insert into public.memberships values ($1,$2,'editor')", [businessA, editor]); }
  });
  await t.test('anonymous callers cannot execute the privileged membership helper', async () => {
    await denied(as(null, () => db.query('select private.can_access_business($1)', [businessA]), 'anon'));
  });
  await t.test('failed writes leave the other tenant unchanged', async () => {
    assert.deepEqual((await db.query('select title,status,note from public.control_actions where id=$1', [actionB])).rows, [{ title: 'Synthetic B action', status: 'Open', note: '' }]);
  });
  await t.test('existing records receive labelled baselines with no invented actor', async () => {
    const { rows } = await db.query('select event_type,actor_id,before_state,after_state from public.action_events where action_id=$1', [actionA]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].event_type, 'baseline');
    assert.equal(rows[0].actor_id, null);
    assert.equal(rows[0].before_state, null);
    assert.equal(rows[0].after_state.title, 'Synthetic A action');
  });
  await t.test('creation records server identity, revision and an atomic history entry', async () => {
    await as(editor, async () => {
      const { rows: [action] } = await db.query("insert into public.control_actions(business_id,title) values ($1,'New synthetic') returning *", [businessA]);
      const { rows: [event] } = await db.query('select * from public.action_events where action_id=$1', [action.id]);
      assert.equal(Number(action.revision), 1);
      assert.equal(event.event_type, 'created');
      assert.equal(event.actor_id, editor);
      assert.equal(event.before_state, null);
      assert.equal(event.after_state.title, action.title);
    });
  });
  await t.test('RPC advances revision and captures before/after evidence', async () => {
    await as(editor, async () => {
      const { rows: [action] } = await save();
      assert.equal(Number(action.revision), 2);
      const { rows: [event] } = await db.query('select * from public.action_events where action_id=$1 and revision=2', [actionA]);
      assert.equal(event.actor_id, editor);
      assert.equal(event.before_state.title, 'Synthetic A action');
      assert.equal(event.after_state.title, 'Reviewed');
      assert.equal(event.after_state.revision, 2);
    });
  });
  await t.test('stale saves return conflict and cannot overwrite a newer edit or add history', async () => {
    await as(editor, async () => {
      await save();
      await db.exec('savepoint stale');
      await assert.rejects(save(actionA, 1, 'Stale overwrite'), e => e.code === 'PT409');
      await db.exec('rollback to savepoint stale');
      const { rows: [action] } = await db.query('select title,revision from public.control_actions where id=$1', [actionA]);
      assert.equal(action.title, 'Reviewed');
      assert.equal(Number(action.revision), 2);
      assert.equal((await db.query('select * from public.action_events where action_id=$1', [actionA])).rows.length, 2);
    });
  });
  await t.test('missing revisions and invalid field values fail without partial history', async () => {
    await assert.rejects(as(editor, () => save(actionA, null)), e => e.code === 'PT409');
    await assert.rejects(as(editor, () => save(actionA, 1, 'Invalid', 'Not a status')), e => e.code === '23514');
    assert.equal((await db.query('select * from public.action_events where action_id=$1', [actionA])).rows.length, 1);
  });
  await t.test('no client role can bypass revision checking with direct updates', async () => {
    for (const user of [owner, editor, viewer]) await denied(as(user, () => db.query("update public.control_actions set note='Bypass' where id=$1", [actionA])));
  });
  await t.test('client inserts cannot forge timestamps or initial revision', async () => {
    await denied(as(editor, () => db.query("insert into public.control_actions(business_id,title,revision) values ($1,'Spoofed',7)", [businessA])));
    await denied(as(editor, () => db.query("insert into public.control_actions(business_id,title,created_at) values ($1,'Spoofed','2020-01-01')", [businessA])));
  });
  await t.test('history is tenant-scoped and append-only for clients', async () => {
    await as(viewer, async () => {
      const { rows } = await db.query('select action_id from public.action_events');
      assert.deepEqual(rows, [{ action_id: actionA }]);
    });
    await denied(as(owner, () => db.query("update public.action_events set event_type='created' where action_id=$1", [actionA])));
    await denied(as(owner, () => db.query('delete from public.action_events where action_id=$1', [actionA])));
    await denied(as(owner, () => db.query("insert into public.action_events(action_id,business_id,revision,event_type,after_state) values ($1,$2,99,'updated','{}')", [actionA, businessA])));
  });
  await t.test('RPC hides missing and foreign actions and denies anonymous callers', async () => {
    await denied(as(owner, () => save(actionB)));
    await denied(as(owner, () => save('20000000-0000-4000-8000-000000000099')));
    await denied(as(null, () => save(), 'anon'));
  });
  await t.test('onboarding atomically creates a business and caller-only owner membership', async () => {
    await as(outsider, async () => {
      const { rows: [business] } = await db.query("select * from public.create_business('  Synthetic starter  ','AUD')");
      assert.equal(business.name, 'Synthetic starter');
      assert.equal(business.currency, 'AUD');
      const { rows } = await db.query('select business_id,user_id,role from public.memberships');
      assert.deepEqual(rows, [{ business_id: business.id, user_id: outsider, role: 'owner' }]);
      assert.equal((await db.query("insert into public.control_actions(business_id,title) values ($1,'First task') returning id", [business.id])).rows.length, 1);
    });
  });
  await t.test('matching onboarding retries return the same business without duplicate memberships', async () => {
    await as(outsider, async () => {
      const first = await db.query("select * from public.create_business('Synthetic starter','AUD')");
      const retry = await db.query("select * from public.create_business('Synthetic starter','AUD')");
      assert.equal(first.rows[0].id, retry.rows[0].id);
      assert.equal((await db.query('select * from public.businesses')).rows.length, 1);
      assert.equal((await db.query('select * from public.memberships')).rows.length, 1);
    });
  });
  await t.test('matching another business name never grants access to that tenant', async () => {
    await as(outsider, async () => {
      const { rows: [business] } = await db.query("select * from public.create_business('Synthetic A','AUD')");
      assert.notEqual(business.id, businessA);
      assert.equal((await db.query('select * from public.businesses where id=$1', [businessA])).rows.length, 0);
      assert.equal((await db.query('select * from public.control_actions where id=$1', [actionA])).rows.length, 0);
    });
  });
  await t.test('changed onboarding retry fails instead of creating or modifying another tenant', async () => {
    await as(outsider, async () => {
      await db.query("select public.create_business('Synthetic starter','AUD')");
      await db.exec('savepoint changed');
      await assert.rejects(db.query("select public.create_business('Different','USD')"), e => e.code === 'PT409');
      await db.exec('rollback to savepoint changed');
      assert.deepEqual((await db.query('select name,currency from public.businesses')).rows, [{ name: 'Synthetic starter', currency: 'AUD' }]);
    });
  });
  await t.test('onboarding rejects unauthenticated calls and malformed business details', async () => {
    await denied(as(null, () => db.query("select public.create_business('Synthetic','AUD')"), 'anon'));
    await denied(as(null, () => db.query("select public.create_business('Synthetic','AUD')")));
    for (const [name, currency] of [[' ', 'AUD'], [null, 'AUD'], ['x'.repeat(201), 'AUD'], ['Synthetic', 'BTC'], ['Synthetic', null]]) {
      await assert.rejects(as(outsider, () => db.query('select public.create_business($1,$2)', [name, currency])), e => e.code === '22023');
    }
  });
  await t.test('onboarding mapping is private and replay cannot restore revoked ownership', async () => {
    await denied(as(outsider, () => db.query('select * from private.business_onboarding')));
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [outsider]);
      await db.exec('set local role authenticated');
      const { rows: [business] } = await db.query("select * from public.create_business('Synthetic starter','AUD')");
      await db.exec('reset role');
      await db.query('delete from public.memberships where business_id=$1', [business.id]);
      await db.exec('set local role authenticated');
      await assert.rejects(db.query("select public.create_business('Synthetic starter','AUD')"), e => e.code === '42501');
    } finally { await db.exec('rollback'); }
  });
  await t.test('blank closure is rejected atomically and valid closure retains history', async () => {
    for (const status of ['Resolved', 'Dismissed']) {
      for (const note of ['', ' ', String.fromCharCode(9, 10)]) {
        await assert.rejects(as(editor, () => db.query('select * from public.update_control_action($1,1,$2,$3,null,$4,$5)', [actionA, 'Review', '', status, note])), e => e.code === '23514');
      }
      await as(editor, async () => {
        const result = await save(actionA, 1, 'Reviewed', status);
        assert.equal(result.rows[0].revision, 2);
        assert.equal((await db.query('select count(*)::int as count from public.action_events where action_id=$1', [actionA])).rows[0].count, 2);
      });
    }
    await as(owner, async () => {
      const result = await db.query('select revision,status from public.control_actions where id=$1', [actionA]);
      assert.equal(result.rows[0].revision, 1);
      assert.equal(result.rows[0].status, 'Open');
      assert.equal((await db.query('select count(*)::int as count from public.action_events where action_id=$1', [actionA])).rows[0].count, 1);
    });
    await assert.rejects(as(editor, () => db.query("insert into public.control_actions(business_id,title,status,note) values ($1,'Synthetic','Resolved','')", [businessA])), e => e.code === '23514');
  });
  await t.test('outcome migration preserves legacy closed rows without inventing evidence or history', async () => {
    await db.exec('begin');
    try {
      await db.exec('alter table public.control_actions drop constraint control_actions_closed_outcome');
      await db.query("update public.control_actions set status='Resolved',note='' where id=$1", [actionA]);
      const before = (await db.query('select count(*)::int as count from public.action_events where action_id=$1', [actionA])).rows[0].count;
      await db.exec(await readFile(new URL('202609080001_action_outcome.sql', directory), 'utf8'));
      const legacy = (await db.query('select status,note from public.control_actions where id=$1', [actionA])).rows[0];
      assert.deepEqual(legacy, { status: 'Resolved', note: '' });
      assert.equal((await db.query('select count(*)::int as count from public.action_events where action_id=$1', [actionA])).rows[0].count, before);
    } finally { await db.exec('rollback'); }
  });
  const requestId = '30000000-0000-4000-8000-000000000001';
  const createAction = (key = requestId, business = businessA, title = 'Synthetic retry') =>
    db.query('select * from public.create_control_action($1,$2,$3,$4,null,$5,$6)', [key, business, title, '', 'Open', '']);
  await t.test('matching creation retries return one action with one created event', async () => {
    await as(editor, async () => {
      const first = (await createAction()).rows[0];
      const retry = (await createAction()).rows[0];
      assert.equal(first.id, retry.id);
      assert.equal(first.created_by, editor);
      assert.equal(retry.revision, 1);
      assert.equal((await db.query('select count(*)::int as count from public.action_events where action_id=$1', [first.id])).rows[0].count, 1);
      assert.equal((await db.query("select count(*)::int as count from public.control_actions where title='Synthetic retry'")).rows[0].count, 1);
    });
  });
  await t.test('creation replay returns later edits without overwriting them', async () => {
    await as(editor, async () => {
      const first = (await createAction()).rows[0];
      await save(first.id, 1, 'Later reviewed title');
      const retry = (await createAction()).rows[0];
      assert.equal(retry.id, first.id);
      assert.equal(retry.title, 'Later reviewed title');
      assert.equal(retry.revision, 2);
      assert.equal((await db.query('select count(*)::int as count from public.action_events where action_id=$1', [first.id])).rows[0].count, 2);
    });
  });
  await t.test('changed creation payload conflicts and missing keys fail', async () => {
    await assert.rejects(as(editor, async () => {
      await createAction();
      await createAction(requestId, businessA, 'Changed draft');
    }), e => e.code === 'PT409');
    await assert.rejects(as(editor, () => createAction(null)), e => e.code === '22023');
  });
  await t.test('creation RPC denies viewers, anonymous and foreign tenant callers', async () => {
    await denied(as(viewer, () => createAction()));
    await denied(as(editor, () => createAction(requestId, businessB)));
    await denied(as(null, () => createAction(), 'anon'));
    await denied(as(editor, () => db.query('select * from private.action_creation_requests')));
  });
  await t.test('identical keys from different authenticated callers do not share actions', async () => {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
      await db.exec('set local role authenticated');
      const first = (await createAction()).rows[0];
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [editor]);
      const second = (await createAction()).rows[0];
      assert.notEqual(first.id, second.id);
      assert.equal(second.created_by, editor);
    } finally { await db.exec('rollback'); }
  });
  await t.test('revoked membership cannot replay a successful creation', async () => {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [editor]);
      await db.exec('set local role authenticated');
      await createAction();
      await db.exec('reset role');
      await db.query('delete from public.memberships where business_id=$1 and user_id=$2', [businessA, editor]);
      await db.exec('set local role authenticated');
      await denied(createAction());
    } finally { await db.exec('rollback'); }
  });
});
