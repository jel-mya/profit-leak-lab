export type MoneyCheckAnswer = 'yes' | 'no' | 'unsure';
export interface MoneyCheckQuestion { id: string; text: string; attentionAnswer: 'yes' | 'no'; highRisk: boolean; area: string; evidence: string; capability: string; href: string }
export interface MoneyCheckResponse extends MoneyCheckQuestion { answer: MoneyCheckAnswer; status: 'attention' | 'uncertain' | 'clear' }
export interface MoneyCheckResult { priority: 'lower' | 'review' | 'priority'; label: string; explanation: string; responses: MoneyCheckResponse[]; attention: MoneyCheckResponse[]; uncertain: MoneyCheckResponse[]; nextChecks: MoneyCheckResponse[] }
export const moneyCheckQuestions: readonly MoneyCheckQuestion[];
export const moneyCheckAnswerLabels: Readonly<Record<MoneyCheckAnswer, string>>;
export function reviewMoneyCheck(answers: Record<string, MoneyCheckAnswer>): MoneyCheckResult;
