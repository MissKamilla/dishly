import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_ROUTE_KEY } from '../auth.constants';

export const Public = () => SetMetadata(IS_PUBLIC_ROUTE_KEY, true);
