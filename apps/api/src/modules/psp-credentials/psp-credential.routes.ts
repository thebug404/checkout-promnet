import { Hono } from 'hono';
import { requirePermission } from '../../middleware/auth.js';
import { PspCredentialController } from './psp-credential.controller.js';

const pspCredentialRoutes = new Hono();

pspCredentialRoutes.get('/', requirePermission('psp_credentials', 'read'), PspCredentialController.findAll);
pspCredentialRoutes.post('/', requirePermission('psp_credentials', 'create'), PspCredentialController.create);
pspCredentialRoutes.patch('/:id', requirePermission('psp_credentials', 'update'), PspCredentialController.update);

export default pspCredentialRoutes;
