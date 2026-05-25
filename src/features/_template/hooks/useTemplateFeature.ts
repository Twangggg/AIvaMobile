import { useQuery } from '@tanstack/react-query';

import { templateService } from '../api/template.service';

export function useTemplateFeature() {
  const itemsQuery = useQuery({ queryKey: ['template-items'], queryFn: () => templateService.getAll() });
  return { itemsQuery };
}
