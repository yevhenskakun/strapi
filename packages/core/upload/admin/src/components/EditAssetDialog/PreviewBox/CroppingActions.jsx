import React, { useState } from 'react';

import { Flex, FocusTrap, IconButton, VisuallyHidden } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { Check, Cross, ChevronDown, ChevronLeft } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import getTrad from '../../../utils/getTrad';

import { CroppingActionRow } from './components';

export const CroppingActions = ({ onCancel, onScale, onValidate, onDuplicate }) => {
  const { formatMessage } = useIntl();

  const [flipH, setFlipH] = useState(true);
  const [flipV, setFlipV] = useState(true);

  const onFlipH = () => {
    onScale(flipV ? 1 : -1, flipH ? -1 : 1);
    setFlipH((e) => !e);
  };

  const onFlipV = () => {
    onScale(flipV ? -1 : 1, flipH ? 1 : -1);
    setFlipV((e) => !e);
  };

  return (
    <FocusTrap onEscape={onCancel}>
      <CroppingActionRow justifyContent="flex-end" paddingLeft={3} paddingRight={3}>
        <Flex gap={1}>
          <IconButton
            label="Flip vertical"
            icon={<ChevronDown />}
            onClick={onFlipH}
          />
          <IconButton
            label="Flip horizontal"
            icon={<ChevronLeft />}
            onClick={onFlipV}
          />
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.stop-crop'),
              defaultMessage: 'Stop cropping',
            })}
            icon={<Cross />}
            onClick={onCancel}
          />

          <Menu.Root>
            <Trigger variant="tertiary" paddingLeft={2} paddingRight={2} endIcon={null}>
              <VisuallyHidden as="span">
                {formatMessage({
                  id: getTrad('control-card.crop'),
                  defaultMessage: 'Crop',
                })}
              </VisuallyHidden>
              <Check
                aria-hidden
                focusable={false}
                style={{ position: 'relative', top: 2 }}
                fill="#C0C0D0"
              />
            </Trigger>
            <Menu.Content zIndex={5}>
              <Menu.Item onSelect={onValidate}>
                {formatMessage({
                  id: getTrad('checkControl.crop-original'),
                  defaultMessage: 'Crop the original asset',
                })}
              </Menu.Item>

              {onDuplicate && (
                <Menu.Item onSelect={onDuplicate}>
                  {formatMessage({
                    id: getTrad('checkControl.crop-duplicate'),
                    defaultMessage: 'Duplicate & crop the asset',
                  })}
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Root>
        </Flex>
      </CroppingActionRow>
    </FocusTrap>
  );
};

const Trigger = styled(Menu.Trigger)`
  svg {
    > g,
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }

  &:hover {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral600};
      }
    }
  }

  &:active {
    svg {
      > g,
      path {
        fill: ${({ theme }) => theme.colors.neutral400};
      }
    }
  }
`;

CroppingActions.defaultProps = {
  onDuplicate: undefined,
};

CroppingActions.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func,
  onValidate: PropTypes.func.isRequired,
};
