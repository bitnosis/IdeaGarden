export const ideaActionsKey = Symbol('idea-actions');
export type IdeaActions = { deleteIdea: (id: string) => void; branchIdea: (id: string) => void; evaluateIdea: (id: string) => void; isBusy: () => boolean; isExpanded: (id: string) => boolean; evaluationColorsEnabled: () => boolean; isRunning: (id: string, role: 'branch' | 'judge') => boolean };
