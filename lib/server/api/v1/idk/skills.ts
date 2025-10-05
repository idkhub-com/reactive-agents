import { zValidator } from '@hono/zod-validator';

import { handleGenerateArms } from '@server/optimization/skill-optimizations';
import { generateEvaluationCreateParams } from '@server/optimization/utils/evaluations';
import type { AppEnv } from '@server/types/hono';
import { getInitialClusterCentroids } from '@server/utils/math';
import type { SkillOptimizationClusterCreateParams } from '@shared/types/data';
import {
  SkillCreateParams,
  SkillQueryParams,
  SkillUpdateParams,
} from '@shared/types/data/skill';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { Hono } from 'hono';
import { z } from 'zod';

export const skillsRouter = new Hono<AppEnv>()
  .post('/', zValidator('json', SkillCreateParams), async (c) => {
    try {
      const data = c.req.valid('json');
      const userDataStorageConnector = c.get('user_data_storage_connector');

      const newSkill = await userDataStorageConnector.createSkill(data);

      // Create initial clusters with equally spaced centroids
      const initialCentroids = getInitialClusterCentroids(
        newSkill.max_configurations,
      );
      const clusterParams: SkillOptimizationClusterCreateParams[] =
        initialCentroids.map((centroid, index) => ({
          agent_id: newSkill.agent_id,
          skill_id: newSkill.id,
          name: `Cluster ${index + 1}`,
          total_steps: 0,
          centroid,
        }));

      await userDataStorageConnector.createSkillOptimizationClusters(
        clusterParams,
      );

      return c.json(newSkill, 201);
    } catch (error) {
      console.error('Error creating skill:', error);
      return c.json({ error: 'Failed to create skill' }, 500);
    }
  })
  .get('/', zValidator('query', SkillQueryParams), async (c) => {
    try {
      const query = c.req.valid('query');
      const connector = c.get('user_data_storage_connector');

      const skills = await connector.getSkills(query);

      return c.json(skills, 200);
    } catch (error) {
      console.error('Error fetching skills:', error);
      return c.json({ error: 'Failed to fetch skills' }, 500);
    }
  })
  .patch(
    '/:skillId',
    zValidator('param', z.object({ skillId: z.uuid() })),
    zValidator('json', SkillUpdateParams),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const data = c.req.valid('json');
        const userDataStorageConnector = c.get('user_data_storage_connector');

        const updatedSkill = await userDataStorageConnector.updateSkill(
          skillId,
          data,
        );

        if (data.max_configurations || data.num_system_prompts) {
          const currentClusters =
            await userDataStorageConnector.getSkillOptimizationClusters({
              skill_id: updatedSkill.id,
            });

          for (const cluster of currentClusters) {
            await userDataStorageConnector.deleteSkillOptimizationCluster(
              cluster.id,
            );
          }

          // Create initial clusters with equally spaced centroids
          const initialCentroids = getInitialClusterCentroids(
            updatedSkill.max_configurations,
          );
          const clusterParams: SkillOptimizationClusterCreateParams[] =
            initialCentroids.map((centroid, index) => ({
              agent_id: updatedSkill.agent_id,
              skill_id: updatedSkill.id,
              name: `Cluster ${index + 1}`,
              total_steps: 0,
              centroid,
            }));

          await userDataStorageConnector.createSkillOptimizationClusters(
            clusterParams,
          );
        }

        if (
          data.description ||
          data.max_configurations ||
          data.num_system_prompts
        ) {
          await handleGenerateArms(c, userDataStorageConnector, skillId);
        }

        return c.json(updatedSkill, 200);
      } catch (error) {
        console.error('Error updating skill:', error);
        return c.json({ error: 'Failed to update skill' }, 500);
      }
    },
  )
  .delete(
    '/:skillId',
    zValidator('param', z.object({ skillId: z.uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        await connector.deleteSkill(skillId);

        return c.body(null, 204);
      } catch (error) {
        console.error('Error deleting skill:', error);
        return c.json({ error: 'Failed to delete skill' }, 500);
      }
    },
  )
  .get(
    '/:skillId/models',
    zValidator('param', z.object({ skillId: z.uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        const models = await connector.getSkillModels(skillId);

        return c.json(models);
      } catch (error) {
        console.error('Error fetching models for skill:', error);
        return c.json({ error: 'Failed to fetch models for skill' }, 500);
      }
    },
  )
  .post(
    '/:skillId/models',
    zValidator('param', z.object({ skillId: z.uuid() })),
    zValidator('json', z.object({ modelIds: z.array(z.uuid()) })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const { modelIds } = c.req.valid('json');
        const connector = c.get('user_data_storage_connector');

        await connector.addModelsToSkill(skillId, modelIds);

        await handleGenerateArms(c, connector, skillId);

        return c.json({ success: true }, 201);
      } catch (error) {
        console.error('Error adding models to skill:', error);
        return c.json({ error: 'Failed to add models to skill' }, 500);
      }
    },
  )
  .delete(
    '/:skillId/models',
    zValidator('param', z.object({ skillId: z.uuid() })),
    zValidator('query', z.object({ ids: z.array(z.uuid()) })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const { ids } = c.req.valid('query');
        const connector = c.get('user_data_storage_connector');

        await connector.removeModelsFromSkill(skillId, ids);

        await handleGenerateArms(c, connector, skillId);

        return c.json({ success: true });
      } catch (error) {
        console.error('Error removing models from skill:', error);
        return c.json({ error: 'Failed to remove models from skill' }, 500);
      }
    },
  )
  .get(
    '/:skillId/clusters',
    zValidator('param', z.object({ skillId: z.uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        const clusters = await connector.getSkillOptimizationClusters({
          skill_id: skillId,
        });

        return c.json(clusters);
      } catch (error) {
        console.error('Error getting clusters for skill:', error);
        return c.json({ error: 'Failed to get clusters for skill' }, 500);
      }
    },
  )
  .get(
    '/:skillId/arms',
    zValidator('param', z.object({ skillId: z.uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        const arms = await connector.getSkillOptimizationArms({
          skill_id: skillId,
        });

        return c.json(arms);
      } catch (error) {
        console.error('Error getting models for skill:', error);
        return c.json({ error: 'Failed to get models for skill' }, 500);
      }
    },
  )
  .post(
    '/:skillId/generate-arms',
    zValidator('param', z.object({ skillId: z.uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        return await handleGenerateArms(c, connector, skillId);
      } catch (error) {
        console.error('Error generating arms:', error);
        return c.json({ error: 'Failed to generate arms' }, 500);
      }
    },
  )
  .get(
    '/:skillId/evaluation-runs',
    zValidator('param', z.object({ skillId: z.uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        const arms = await connector.getSkillOptimizationEvaluationRuns({
          skill_id: skillId,
        });

        return c.json(arms);
      } catch (error) {
        console.error('Error getting evaluation runs:', error);
        return c.json({ error: 'Failed to get evaluation runs' }, 500);
      }
    },
  )
  .get(
    '/:skillId/evaluations',
    zValidator('param', z.object({ skillId: z.uuid() })),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const connector = c.get('user_data_storage_connector');

        const evaluations = await connector.getSkillOptimizationEvaluations({
          skill_id: skillId,
        });

        return c.json(evaluations);
      } catch (error) {
        console.error('Error getting evaluations:', error);
        return c.json({ error: 'Failed to get evaluations' }, 500);
      }
    },
  )
  .post(
    '/:skillId/evaluations',
    zValidator('param', z.object({ skillId: z.uuid() })),
    zValidator(
      'json',
      z.object({ methods: z.array(z.enum(EvaluationMethodName)) }),
    ),
    async (c) => {
      try {
        const { skillId } = c.req.valid('param');
        const { methods } = c.req.valid('json');
        const userDataStorageConnector = c.get('user_data_storage_connector');
        const evaluationConnectorsMap = c.get('evaluation_connectors_map');

        const skills = await userDataStorageConnector.getSkills({
          id: skillId,
        });

        if (skills.length === 0) {
          return c.json({ error: 'Skill not found' }, 404);
        }

        const skill = skills[0];

        const createParamsList = [];
        for (const method of methods) {
          const evaluationConnector = evaluationConnectorsMap[method];
          if (!evaluationConnector) {
            throw new Error(
              `Evaluation connector not found for method ${method}`,
            );
          }

          const createParams = await generateEvaluationCreateParams(
            skill,
            evaluationConnector,
            method,
          );

          createParamsList.push(createParams);
        }

        const createdEvaluations =
          await userDataStorageConnector.createSkillOptimizationEvaluations(
            createParamsList,
          );

        return c.json({ createdEvaluations }, 200);
      } catch (error) {
        console.error('Error generating evaluations:', error);
        return c.json({ error: 'Failed to generate evaluations' }, 500);
      }
    },
  )
  .delete(
    '/:skillId/evaluations/:evaluationId',
    zValidator(
      'param',
      z.object({ skillId: z.uuid(), evaluationId: z.uuid() }),
    ),
    async (c) => {
      try {
        const { evaluationId } = c.req.valid('param');
        const userDataStorageConnector = c.get('user_data_storage_connector');

        await userDataStorageConnector.deleteSkillOptimizationEvaluation(
          evaluationId,
        );

        return c.json({ message: 'Evaluations deleted successfully' }, 200);
      } catch (error) {
        console.error('Error deleting evaluations:', error);
        return c.json({ error: 'Failed to delete evaluations' }, 500);
      }
    },
  );
