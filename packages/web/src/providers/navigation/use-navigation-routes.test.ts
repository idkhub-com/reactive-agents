import { renderHook } from '@testing-library/react';
import {
  type NavigateFn,
  useNavigationRoutes,
} from '@web/providers/navigation/use-navigation-routes';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

describe('useNavigationRoutes', () => {
  let mockNavigate: Mock<NavigateFn>;

  beforeEach(() => {
    mockNavigate = vi.fn<NavigateFn>();
  });

  it('returns all navigation functions', () => {
    const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

    expect(result.current).toHaveProperty('navigateToSkillDashboard');
    expect(result.current).toHaveProperty('navigateToLogs');
    expect(result.current).toHaveProperty('navigateToLogDetail');
    expect(result.current).toHaveProperty('navigateToEvaluations');
    expect(result.current).toHaveProperty('navigateToEvaluationDetail');
    expect(result.current).toHaveProperty('navigateToEditEvaluation');
    expect(result.current).toHaveProperty('navigateToCreateEvaluation');
    expect(result.current).toHaveProperty('replaceToLogDetail');
    expect(result.current).toHaveProperty('replaceToEvaluations');
    expect(result.current).toHaveProperty('navigateToDatasets');
    expect(result.current).toHaveProperty('replaceToDatasets');
    expect(result.current).toHaveProperty('navigateToDatasetDetail');
    expect(result.current).toHaveProperty('navigateToCreateDataset');
    expect(result.current).toHaveProperty('navigateToConfigurations');
    expect(result.current).toHaveProperty('navigateToModels');
    expect(result.current).toHaveProperty('navigateToClusters');
    expect(result.current).toHaveProperty('navigateToClusterArms');
    expect(result.current).toHaveProperty('navigateToArmDetail');
  });

  describe('navigateToSkillDashboard', () => {
    it('navigates with properly encoded agent and skill names', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToSkillDashboard('My Agent', 'My Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/My%20Agent/skills/My%20Skill',
      });
    });

    it('handles special characters in names', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToSkillDashboard('Agent & Co.', 'Skill #1 (Test)');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent%20%26%20Co./skills/Skill%20%231%20(Test)',
      });
    });
  });

  describe('navigateToLogs', () => {
    it("navigates to the agent's logs page", () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToLogs('Agent');

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/agents/Agent/logs' });
    });

    it('narrows it to a skill by search param', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToLogs('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/logs',
        search: { skill: 'Skill' },
      });
    });
  });

  describe('navigateToLogDetail', () => {
    it('navigates to specific log', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToLogDetail('Agent', 'log-123');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/logs/log-123',
      });
    });
  });

  describe('navigateToEvaluations', () => {
    it('navigates to evaluations page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToEvaluations('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/evaluations',
      });
    });
  });

  describe('navigateToEvaluationDetail', () => {
    it('navigates to specific evaluation', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToEvaluationDetail('Agent', 'Skill', 'eval-456');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/evaluations/eval-456',
      });
    });
  });

  describe('navigateToEditEvaluation', () => {
    it('navigates to edit evaluation page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToEditEvaluation('Agent', 'Skill', 'eval-789');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/evaluations/eval-789/edit',
      });
    });
  });

  describe('navigateToCreateEvaluation', () => {
    it('navigates to create evaluation page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToCreateEvaluation('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/evaluations/create',
      });
    });
  });

  describe('replaceToLogDetail', () => {
    it('replaces navigation to a log detail page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.replaceToLogDetail('Agent', 'log-1');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/logs/log-1',
        replace: true,
      });
    });
  });

  describe('replaceToEvaluations', () => {
    it('replaces navigation to evaluations page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.replaceToEvaluations('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/evaluations',
        replace: true,
      });
    });
  });

  describe('navigateToDatasets', () => {
    it('navigates to datasets page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToDatasets('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/datasets',
      });
    });
  });

  describe('replaceToDatasets', () => {
    it('replaces navigation to datasets page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.replaceToDatasets('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/datasets',
        replace: true,
      });
    });
  });

  describe('navigateToDatasetDetail', () => {
    it('navigates to specific dataset', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToDatasetDetail('Agent', 'Skill', 'dataset-123');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/datasets/dataset-123',
      });
    });
  });

  describe('navigateToCreateDataset', () => {
    it('navigates to create dataset page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToCreateDataset('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/datasets/create',
      });
    });
  });

  describe('navigateToConfigurations', () => {
    it('navigates to configurations page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToConfigurations('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/configurations',
      });
    });
  });

  describe('navigateToModels', () => {
    it('navigates to models page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToModels('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/models',
      });
    });
  });

  describe('navigateToClusters', () => {
    it('navigates to clusters page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToClusters('Agent', 'Skill');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/clusters',
      });
    });
  });

  describe('navigateToClusterArms', () => {
    it('navigates to cluster configurations', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToClusterArms('Agent', 'Skill', 'Cluster');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/clusters/Cluster/configurations',
      });
    });

    it('encodes cluster name properly', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToClusterArms('Agent', 'Skill', 'My Cluster');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/clusters/My%20Cluster/configurations',
      });
    });
  });

  describe('navigateToArmDetail', () => {
    it('navigates to arm detail page', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToArmDetail('Agent', 'Skill', 'Cluster', 'Arm');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent/skills/Skill/clusters/Cluster/configurations/Arm',
      });
    });

    it('encodes all parameters properly', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToArmDetail(
        'My Agent',
        'My Skill',
        'My Cluster',
        'My Arm',
      );

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/My%20Agent/skills/My%20Skill/clusters/My%20Cluster/configurations/My%20Arm',
      });
    });
  });

  describe('callback stability', () => {
    it('maintains stable references across rerenders', () => {
      const { result, rerender } = renderHook(() =>
        useNavigationRoutes(mockNavigate),
      );

      const firstRender = { ...result.current };
      rerender();
      const secondRender = result.current;

      // All callbacks should maintain reference equality
      expect(firstRender.navigateToSkillDashboard).toBe(
        secondRender.navigateToSkillDashboard,
      );
      expect(firstRender.navigateToLogs).toBe(secondRender.navigateToLogs);
      expect(firstRender.navigateToArmDetail).toBe(
        secondRender.navigateToArmDetail,
      );
    });
  });

  describe('URL encoding edge cases', () => {
    it('handles unicode characters', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToSkillDashboard('Agente Español', 'スキル日本語');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agente%20Espa%C3%B1ol/skills/%E3%82%B9%E3%82%AD%E3%83%AB%E6%97%A5%E6%9C%AC%E8%AA%9E',
      });
    });

    it('handles slashes in names', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToSkillDashboard('Agent/v2', 'Skill/Test');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents/Agent%2Fv2/skills/Skill%2FTest',
      });
    });

    it('handles empty strings', () => {
      const { result } = renderHook(() => useNavigationRoutes(mockNavigate));

      result.current.navigateToSkillDashboard('', '');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/agents//skills/',
      });
    });
  });
});
