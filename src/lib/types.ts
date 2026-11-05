import type { Node, Edge } from '@xyflow/svelte';
import type { CardFont } from './card-fonts';
export const providers = ['openrouter', 'anthropic', 'openai', 'ollama'] as const;
export type Provider = typeof providers[number];
export const roles = ['seed', 'branch', 'cross', 'judge', 'summary', 'prompt'] as const;
export type Role = typeof roles[number];
export type SettingsTab = 'settings' | 'connections' | 'models';
export type Verdict = { originality: number; feasibility: number; impact: number; reason: string; keywords: string[] };
export type Idea = { title: string; description: string; kind: 'seed' | 'branch' | 'cross'; verdict?: Verdict; starred?: boolean; [key: string]: unknown };
export type IdeaNode = Node<Idea, 'idea'>;
export type PromptNode = Node<{ title: string; markdown: string; [key: string]: unknown }, 'prompt'>;
export type GraphNode = IdeaNode | PromptNode;
export type Board = { id: string; title: string; goal: string; nodes: GraphNode[]; edges: Edge[]; summary?: string; created: string };
export type Settings = { provider: Provider; keys: Record<Provider, string>; models: Record<Provider, string>; roleModels: Record<Role, string>; ollamaUrl: string; theme: string; ideaView: 'sidebar' | 'modal'; evaluationColors: boolean; autoEvaluate: boolean; cardFont: CardFont };
export function defaultSettings(): Settings { return { provider: 'openrouter', keys: { openrouter: '', anthropic: '', openai: '', ollama: '' }, models: { openrouter: 'anthropic/claude-sonnet-4.5', anthropic: 'claude-sonnet-4-5', openai: 'gpt-4.1-mini', ollama: 'qwen3:8b' }, roleModels: { seed: '', branch: '', cross: '', judge: '', summary: '', prompt: '' }, ollamaUrl: 'http://127.0.0.1:11434', theme: 'abyss', ideaView: 'sidebar', evaluationColors: true, autoEvaluate: false, cardFont: 'bookish' }; }
export function score(v?: Verdict) { return v ? v.originality + v.feasibility + v.impact : 0; }
export function medal(v?: Verdict) { const n = score(v); return n >= 13 ? 'gold' : n >= 11 ? 'silver' : n >= 9 ? 'bronze' : 'unrated'; }
export function createBoard(title = 'Untitled exploration', goal = ''): Board { return { id: crypto.randomUUID(), title, goal, nodes: [], edges: [], created: new Date().toISOString() }; }
export function demoBoard(): Board {
  const board = createBoard('The next small thing', 'Find a useful, delightful product that a solo maker can build in a weekend.');
  const ideas: [string, string, number, number, Idea['kind']][] = [
    ['Make everyday life a little lighter', 'Small tools that turn daily friction into a moment of calm. Start here, then follow your curiosity.', 80, 230, 'seed'],
    ['A gentler daily planner', 'A planner built around your energy, with just three meaningful priorities each day.', 470, 40, 'branch'],
    ['The neighbourhood skill swap', 'Trade an hour of what you know for an hour of something you want to learn.', 470, 420, 'branch'],
    ['Tiny rituals, real momentum', 'Combine energy-aware planning with five-minute rituals that make starting feel effortless.', 870, 180, 'cross']
  ];
  board.nodes = ideas.map(([title, description, x, y, kind], i) => ({ id: `demo-${i}`, type: 'idea', position: { x, y }, data: { title, description, kind, ...(i === 3 ? { verdict: { originality: 4, feasibility: 5, impact: 4, reason: 'A focused, buildable combination with a clear daily benefit. This is an illustrative sample score.', keywords: ['wellbeing', 'rituals', 'productivity'] } } : {}) } }));
  board.edges = [[0,1],[0,2],[1,3],[2,3]].map(([s,t]) => ({ id: `${s}-${t}`, source: `demo-${s}`, target: `demo-${t}`, type: 'default' }));
  return board;
}
