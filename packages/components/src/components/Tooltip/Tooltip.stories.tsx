import styled from 'styled-components';
import { Tooltip as TooltipComponent, TooltipInteraction, TooltipProps } from './Tooltip';
import { Meta, StoryObj } from '@storybook/react';
import { Placement } from '@floating-ui/react';
import { Elevation, mapElevationToBackground, spacingsPx, zIndices } from '@trezor/theme';
import { ElevationContext, useElevation } from '../ElevationContext/ElevationContext';

const Center = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${spacingsPx.xxl};
    justify-content: center;
    width: 100%;
    padding: 100px 0;
`;

const HigherZ = styled.div<{ $elevation: Elevation }>`
    display: flex;
    flex-direction: column;
    height: 100px;
    justify-content: center;
    background-color: ${mapElevationToBackground};

    // Simulate "Modal"
    z-index: ${zIndices.modal};
    position: relative;
`;

const ModalMock = (args: TooltipProps) => {
    const { elevation } = useElevation();

    return (
        <HigherZ $elevation={elevation}>
            <TooltipComponent {...args}>
                <span>Text with tooltip in Modal</span>
            </TooltipComponent>
        </HigherZ>
    );
};

const Addon = styled.span`
    background: blue;
    padding: 4px 8px;
    border-radius: 4px;
    color: white;
`;

const meta: Meta = {
    title: 'Misc/Tooltip',
    component: TooltipComponent,
} as Meta;
export default meta;

export const Tooltip: StoryObj<TooltipProps> = {
    render: args => (
        <Center>
            <TooltipComponent {...args}>
                <span>Text with tooltip</span>
            </TooltipComponent>
            <ElevationContext baseElevation={0}>
                <ModalMock {...args} />
            </ElevationContext>
        </Center>
    ),
    args: {
        content: 'Passphrase is an optional feature',
        offset: 10,
        initialOpen: false,
        interaction: 'hover',
    },
    argTypes: {
        initialOpen: {
            type: 'boolean',
        },
        maxWidth: {
            type: 'number',
        },
        title: {
            options: ['null', 'title'],
            mapping: { null: null, title: <span>Title</span> },
            control: {
                type: 'select',
                labels: {
                    null: 'Null',
                    title: 'Title',
                },
            },
        },
        placement: {
            control: 'radio',
            options: ['top', 'right', 'bottom', 'left'] as Placement[],
        },
        cursor: {
            options: ['pointer', 'help', 'not-allowed', 'default'],
        },
        addon: {
            options: ['null', 'addon'],
            mapping: { null: null, addon: <Addon>Addon</Addon> },
            control: {
                type: 'select',
                labels: {
                    null: 'Null',
                    addon: 'Addon',
                },
            },
        },
        interaction: {
            control: 'radio',
            options: ['hover', 'none'] as TooltipInteraction[],
        },
    },
};
