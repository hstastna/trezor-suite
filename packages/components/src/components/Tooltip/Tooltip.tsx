import styled from 'styled-components';
import { useState, ReactNode, useEffect, HtmlHTMLAttributes } from 'react';
import { transparentize } from 'polished';
import { zIndices } from '@trezor/theme';

import { TooltipContent, TooltipFloatingUi, TooltipTrigger } from './TooltipFloatingUi';
import { FloatingDelayGroup, Placement } from '@floating-ui/react';
import { TooltipBox, TooltipBoxProps } from './TooltipBox';

export const TOOLTIP_DELAY_NONE = 0;
export const TOOLTIP_DELAY_SHORT = 200;
export const TOOLTIP_DELAY_NORMAL = 500;
export const TOOLTIP_DELAY_LONG = 1000;

export type Cursor = 'inherit' | 'pointer' | 'help' | 'default' | 'not-allowed';

const Wrapper = styled.div<{ $isFullWidth: boolean }>`
    width: ${({ $isFullWidth }) => ($isFullWidth ? '100%' : 'auto')};
`;

const Content = styled.div<{ $dashed: boolean; $cursor: Cursor }>`
    cursor: ${({ $cursor }) => $cursor};

    > * {
        border-bottom: ${({ $dashed, theme }) =>
            $dashed && `1.5px dashed ${transparentize(0.66, theme.TYPE_LIGHT_GREY)}`};
        cursor: ${({ $cursor }) => $cursor};
    }
`;

export type TooltipDelay =
    | typeof TOOLTIP_DELAY_NONE
    | typeof TOOLTIP_DELAY_SHORT
    | typeof TOOLTIP_DELAY_NORMAL
    | typeof TOOLTIP_DELAY_LONG;

export type TooltipInteraction = 'none' | 'hover';

export type TooltipProps = {
    children: ReactNode;
    placement?: Placement;
    className?: string;
    disabled?: boolean;
    onShow?: () => void;
    onHide?: () => void;
    initialOpen?: boolean;
    delayShow?: TooltipDelay;
    delayHide?: TooltipDelay;
    dashed?: boolean;
    offset?: number;
    cursor?: Cursor;
    isFullWidth?: boolean;
    interaction?: TooltipInteraction;
} & TooltipBoxProps;

type InteractionProps = Pick<HtmlHTMLAttributes<HTMLDivElement>, 'onMouseEnter' | 'onMouseLeave'>;

export const Tooltip = ({
    placement = 'top',
    children,
    isLarge = false,
    dashed = false,
    delayShow = TOOLTIP_DELAY_SHORT,
    delayHide = TOOLTIP_DELAY_SHORT,
    maxWidth = 400,
    offset = 10,
    cursor = 'help',
    content,
    addon,
    title,
    headerIcon,
    disabled,
    onShow,
    onHide,
    className,
    isFullWidth = false,
    initialOpen = false,
    interaction = 'hover',
}: TooltipProps) => {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        setIsOpen(initialOpen);
    }, [initialOpen]);

    if (!content || !children) {
        return <>{children}</>;
    }

    const interactionProps: InteractionProps =
        interaction === 'hover'
            ? {
                  onMouseEnter: () => setIsOpen(true),
                  onMouseLeave: () => setIsOpen(false),
              }
            : {};

    return (
        <Wrapper $isFullWidth={isFullWidth} className={className}>
            <FloatingDelayGroup delay={{ open: delayShow, close: delayHide }}>
                <TooltipFloatingUi
                    placement={placement}
                    open={isOpen}
                    onOpenChange={open => {
                        setIsOpen(open);

                        if (open) {
                            onShow?.();
                        } else {
                            onHide?.();
                        }
                    }}
                    offset={offset}
                >
                    <TooltipTrigger asChild {...interactionProps}>
                        <Content $dashed={dashed} $cursor={disabled ? 'default' : cursor}>
                            {children}
                        </Content>
                    </TooltipTrigger>

                    <TooltipContent data-test="@tooltip" style={{ zIndex: zIndices.tooltip }}>
                        <TooltipBox
                            content={content}
                            isOpen={isOpen}
                            addon={addon}
                            headerIcon={headerIcon}
                            isLarge={isLarge}
                            maxWidth={maxWidth}
                            title={title}
                        />
                    </TooltipContent>
                </TooltipFloatingUi>
            </FloatingDelayGroup>
        </Wrapper>
    );
};
