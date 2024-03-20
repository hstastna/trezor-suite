import styled from 'styled-components';
import { useState, ReactElement, ReactNode, useEffect, HtmlHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { transparentize } from 'polished';
import { borders, palette, spacings, spacingsPx, typography, zIndices } from '@trezor/theme';

import { Icon, IconType } from '../assets/Icon/Icon';
import { TooltipContent, TooltipFloatingUi, TooltipTrigger } from './TooltipFloatingUi';
import { FloatingDelayGroup, Placement } from '@floating-ui/react';

export const TOOLTIP_DELAY_NONE = 0;
export const TOOLTIP_DELAY_SHORT = 200;
export const TOOLTIP_DELAY_NORMAL = 500;
export const TOOLTIP_DELAY_LONG = 1000;

export type Cursor = 'inherit' | 'pointer' | 'help' | 'default' | 'not-allowed';

const getContainerPadding = (isLarge: boolean, isWithHeader: boolean) => {
    if (isLarge) {
        if (isWithHeader) {
            return `${spacingsPx.sm} ${spacingsPx.md} ${spacingsPx.xs}`;
        }

        return `${spacingsPx.xs} ${spacingsPx.md}`;
    }

    return spacingsPx.xs;
};

const Wrapper = styled.div<{ $isFullWidth: boolean }>`
    width: ${({ $isFullWidth }) => ($isFullWidth ? '100%' : 'auto')};
`;

type TooltipContainerProps = {
    $maxWidth: string | number;
    $isLarge: boolean;
    $isWithHeader: boolean;
};

const TooltipContainerStyled = styled(motion.div)<TooltipContainerProps>`
    background: ${palette.darkGray300};
    color: ${palette.lightWhiteAlpha1000};
    border-radius: ${borders.radii.sm};
    text-align: left;
    border: solid 1.5px ${palette.darkGray100};
    max-width: ${props => props.$maxWidth}px;
    ${typography.hint}

    > div {
        padding: ${({ $isLarge, $isWithHeader }) => getContainerPadding($isLarge, $isWithHeader)};
    }
`;

const HeaderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${spacingsPx.sm};
    width: 100%;
`;

const TooltipTitle = styled.div<{ $isLarge: boolean }>`
    display: flex;
    align-items: center;
    gap: ${spacingsPx.xxs};
    width: 100%;
    color: ${({ theme }) => theme.textSubdued};
    ${({ $isLarge }) => ($isLarge ? typography.highlight : typography.hint)}
`;

const Addon = styled.div`
    margin-left: auto;
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

type TooltipComponentProps = {
    content: ReactNode;
    maxWidth?: string | number;
    /**
     *  @description Legacy prop
     */
    isLarge?: boolean;
    addon?: ReactNode;
    headerIcon?: IconType;
    title?: ReactElement;
};

type TooltipComponentExtendedProps = TooltipComponentProps &
    Required<Pick<TooltipComponentProps, 'maxWidth' | 'isLarge'>> & { isOpen: boolean };

const TooltipContainer = ({
    isOpen,
    addon,
    maxWidth,
    isLarge,
    content,
    headerIcon,
    title,
}: TooltipComponentExtendedProps) => (
    <TooltipContainerStyled
        $isLarge={isLarge}
        $isWithHeader={!!(title || addon)}
        $maxWidth={maxWidth}
        tabIndex={-1}
        animate={isOpen ? 'shown' : 'hidden'}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
        {(title || addon) && (
            <HeaderContainer>
                {title && (
                    <TooltipTitle $isLarge={isLarge}>
                        {headerIcon && <Icon icon={headerIcon} size={spacings.md} />}
                        {title}
                    </TooltipTitle>
                )}

                {addon && <Addon>{addon}</Addon>}
            </HeaderContainer>
        )}

        <div>{content}</div>
    </TooltipContainerStyled>
);

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
} & TooltipComponentProps;

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
                        <TooltipContainer
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
