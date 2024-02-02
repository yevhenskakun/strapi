import { useNotification } from '@strapi/helper-plugin';
import { useMutation, useQueryClient } from 'react-query';

import pluginId from '../pluginId';
import { deleteRequest } from '../utils/deleteRequest';

export const useRemoveAsset = (onSuccess) => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const mutation = useMutation((assetId) => deleteRequest('files', assetId), {
    onSuccess() {
      queryClient.refetchQueries([pluginId, 'assets'], { active: true });
      queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });

      toggleNotification({
        type: 'success',
        message: {
          id: 'modal.remove.success-label',
          defaultMessage: 'Elements have been successfully deleted.',
        },
      });

      onSuccess();
    },
    onError(error) {
      const message = error.response?.data?.error?.message || error.message;
      toggleNotification({ type: 'warning', message });
    },
  });

  const removeAsset = (assetId) => mutation.mutate(assetId);

  return { ...mutation, removeAsset };
};
