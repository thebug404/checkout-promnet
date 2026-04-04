import { Hono } from 'hono';
import type { AppVariables } from '../../types.js';
import { requirePermission } from '../../middleware/auth.js';
import { ApiKeyController } from './api-key.controller.js';

const apiKeyRoutes = new Hono<{ Variables: AppVariables }>();

apiKeyRoutes.get('/', requirePermission('api_keys', 'read'), ApiKeyController.findAll);
apiKeyRoutes.get('/:id', requirePermission('api_keys', 'read'), ApiKeyController.findById);
apiKeyRoutes.post('/', requirePermission('api_keys', 'create'), ApiKeyController.create);
apiKeyRoutes.patch('/:id', requirePermission('api_keys', 'create'), ApiKeyController.update);
apiKeyRoutes.post('/:id/revoke', requirePermission('api_keys', 'revoke'), ApiKeyController.revoke);

export default apiKeyRoutes;
