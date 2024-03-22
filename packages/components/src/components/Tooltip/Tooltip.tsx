import styled from 'styled-components';
import { useState, ReactNode, useEffect, HtmlHTMLAttributes, MutableRefObject } from 'react';
import { transparentize } from 'polished';
import { zIndices } from '@trezor/theme';
import { TooltipContent, TooltipFloatingUi, TooltipTrigger } from './TooltipFloatingUi';
import { FloatingDelayGroup, Placement } from '@floating-ui/react';
import { TooltipBox, TooltipBoxProps } from './TooltipBox';
import { TooltipArrow } from './TooltipArrow';

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
    isOpen?: boolean;
    placement?: Placement;
    hasArrow?: boolean;
    appendTo?: HTMLElement | null | MutableRefObject<HTMLElement | null>;
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
    isOpen,
    hasArrow = false,
    appendTo,
}: TooltipProps) => {
    const [isOpenState, setIsOpenState] = useState(false);

    const isControlled = isOpen !== undefined;

    useEffect(() => {
        if (initialOpen !== undefined || isOpen !== undefined) {
            setIsOpenState(initialOpen || isOpen === true);
        }
    }, [initialOpen, isOpen]);

    if (!content || !children) {
        return <>{children}</>;
    }

    const interactionProps: InteractionProps =
        interaction === 'hover' && !isControlled
            ? {
                  onMouseEnter: () => setIsOpenState(true),
                  onMouseLeave: () => setIsOpenState(false),
              }
            : {};

    const handleOnOpenChange = (open: boolean) => {
        setIsOpenState(open);

        if (open) {
            onShow?.();
        } else {
            onHide?.();
        }
    };

    return (
        <Wrapper $isFullWidth={isFullWidth} className={className}>
            <FloatingDelayGroup delay={{ open: delayShow, close: delayHide }}>
                <TooltipFloatingUi
                    placement={placement}
                    isOpen={isOpenState}
                    onOpenChange={isControlled ? undefined : handleOnOpenChange}
                    offset={offset}
                >
                    <TooltipTrigger {...interactionProps}>
                        <Content $dashed={dashed} $cursor={disabled ? 'default' : cursor}>
                            {children}
                        </Content>
                    </TooltipTrigger>

                    <TooltipContent
                        data-test="@tooltip"
                        style={{ zIndex: zIndices.tooltip }}
                        arrowRender={hasArrow ? TooltipArrow : undefined}
                        appendTo={appendTo}
                    >
                        <TooltipBox
                            content={content}
                            isOpen={isOpenState}
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
