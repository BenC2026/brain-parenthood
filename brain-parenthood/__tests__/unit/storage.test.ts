/**
 * Unit tests for lib/storage.ts
 * localStorage is mocked by jsdom in the test environment.
 */

import {
  saveBaseline,
  getBaseline,
  saveGoals,
  getGoals,
  saveProgress,
  getProgress,
  completeModule,
  isModuleCompleted,
  getModuleAnswers,
  saveModuleAnswers,
  clearAllData,
  BaselineData,
  GoalsData,
  UserProgress,
} from '@/lib/storage';

// Silence console errors in tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Reset localStorage and fetch mock between tests
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  // Mock fetch so DB sync calls don't throw
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

// ─── Baseline ────────────────────────────────────────────────────────────────

describe('saveBaseline / getBaseline', () => {
  const sample: BaselineData = {
    teamStressLevel: 7,
    individualStressLevel: 6,
    productivity: 5,
    communication: 8,
    workLifeBalance: 4,
    teamSize: '5-10',
    primaryChallenges: 'burnout',
  };

  it('persists baseline data to localStorage', () => {
    saveBaseline(sample);
    const result = getBaseline();
    expect(result).not.toBeNull();
    expect(result?.teamStressLevel).toBe(7);
    expect(result?.primaryChallenges).toBe('burnout');
  });

  it('adds completedAt timestamp', () => {
    saveBaseline(sample);
    const result = getBaseline();
    expect(result?.completedAt).toBeDefined();
    expect(new Date(result!.completedAt!).getTime()).not.toBeNaN();
  });

  it('returns null when nothing is stored', () => {
    expect(getBaseline()).toBeNull();
  });

  it('overwrites existing baseline on re-save', () => {
    saveBaseline(sample);
    saveBaseline({ ...sample, teamStressLevel: 2 });
    expect(getBaseline()?.teamStressLevel).toBe(2);
  });
});

// ─── Goals ───────────────────────────────────────────────────────────────────

describe('saveGoals / getGoals', () => {
  const sample: GoalsData = {
    stressReduction: 'meditate daily',
    productivityGoal: 'ship weekly',
    communicationGoal: 'daily standups',
    personalGoal: 'sleep 8h',
    teamGoal: 'reduce meetings',
    successMetrics: 'NPS > 8',
  };

  it('persists goals data', () => {
    saveGoals(sample);
    const result = getGoals();
    expect(result?.stressReduction).toBe('meditate daily');
    expect(result?.successMetrics).toBe('NPS > 8');
  });

  it('adds completedAt timestamp', () => {
    saveGoals(sample);
    expect(getGoals()?.completedAt).toBeDefined();
  });

  it('returns null when nothing is stored', () => {
    expect(getGoals()).toBeNull();
  });
});

// ─── Progress ─────────────────────────────────────────────────────────────────

describe('saveProgress / getProgress', () => {
  it('returns default progress when nothing is stored', () => {
    const p = getProgress();
    expect(p.completedModules).toEqual([]);
    expect(p.currentModule).toBe(1);
  });

  it('persists and retrieves progress', () => {
    const data: UserProgress = { completedModules: [1, 2], currentModule: 3 };
    saveProgress(data);
    const result = getProgress();
    expect(result.completedModules).toEqual([1, 2]);
    expect(result.currentModule).toBe(3);
  });

  it('adds lastActivity timestamp on save', () => {
    saveProgress({ completedModules: [], currentModule: 1 });
    expect(getProgress().lastActivity).toBeDefined();
  });
});

// ─── completeModule ───────────────────────────────────────────────────────────

describe('completeModule', () => {
  it('adds module to completedModules', () => {
    completeModule(1);
    expect(getProgress().completedModules).toContain(1);
  });

  it('does not duplicate a module', () => {
    completeModule(1);
    completeModule(1);
    const completed = getProgress().completedModules;
    expect(completed.filter((m) => m === 1)).toHaveLength(1);
  });

  it('keeps completedModules sorted', () => {
    completeModule(3);
    completeModule(1);
    completeModule(2);
    expect(getProgress().completedModules).toEqual([1, 2, 3]);
  });

  it('advances currentModule to next incomplete module', () => {
    completeModule(1);
    expect(getProgress().currentModule).toBe(2);
  });

  it('does not advance currentModule past 12', () => {
    completeModule(12);
    // currentModule should not become 13
    expect(getProgress().currentModule).toBeLessThanOrEqual(12);
  });
});

// ─── isModuleCompleted ────────────────────────────────────────────────────────

describe('isModuleCompleted', () => {
  it('returns false when module is not complete', () => {
    expect(isModuleCompleted(1)).toBe(false);
  });

  it('returns true after module is completed', () => {
    completeModule(2);
    expect(isModuleCompleted(2)).toBe(true);
  });
});

// ─── Module Answers ───────────────────────────────────────────────────────────

describe('saveModuleAnswers / getModuleAnswers', () => {
  it('saves and retrieves assessment answers', () => {
    saveModuleAnswers(3, 'assessment', { q1: 'answer A' });
    const result = getModuleAnswers(3, 'assessment');
    expect(result?.q1).toBe('answer A');
  });

  it('saves and retrieves goals answers', () => {
    saveModuleAnswers(5, 'goals', { goal: 'run a 5k' });
    expect(getModuleAnswers(5, 'goals')?.goal).toBe('run a 5k');
  });

  it('returns null for a key that has not been saved', () => {
    expect(getModuleAnswers(99, 'assessment')).toBeNull();
  });

  it('adds savedAt timestamp', () => {
    saveModuleAnswers(1, 'goals', { x: 1 });
    expect(getModuleAnswers(1, 'goals')?.savedAt).toBeDefined();
  });
});

// ─── clearAllData ─────────────────────────────────────────────────────────────

describe('clearAllData', () => {
  it('removes baseline, goals, and progress from localStorage', () => {
    saveBaseline({ teamStressLevel: 5, individualStressLevel: 5, productivity: 5, communication: 5, workLifeBalance: 5, teamSize: '1', primaryChallenges: '' });
    saveGoals({ stressReduction: '', productivityGoal: '', communicationGoal: '', personalGoal: '', teamGoal: '', successMetrics: '' });
    saveProgress({ completedModules: [1], currentModule: 2 });

    clearAllData();

    expect(getBaseline()).toBeNull();
    expect(getGoals()).toBeNull();
    expect(getProgress().completedModules).toEqual([]);
  });
});
