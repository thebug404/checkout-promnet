import { Hono } from 'hono';
import type { AppVariables } from '../../types.js';
import { requirePermission } from '../../middleware/auth.js';
import { PspCredentialController } from './psp-credential.controller.js';

const pspCredentialRoutes = new Hono<{ Variables: AppVariables }>();

pspCredentialRoutes.get('/', requirePermission('psp_credentials', 'read'), PspCredentialController.findAll);
pspCredentialRoutes.post('/', requirePermission('psp_credentials', 'create'), PspCredentialController.create);
pspCredentialRoutes.patch('/:id', requirePermission('psp_credentials', 'update'), PspCredentialController.update);
pspCredentialRoutes.delete('/:id', requirePermission('psp_credentials', 'delete'), PspCredentialController.delete);

export default pspCredentialRoutes;
