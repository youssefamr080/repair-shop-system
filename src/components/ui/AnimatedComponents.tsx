/**
 * Animated Components Library
 * Premium Framer Motion utilities for Mayo Fix
 * 
 * Features:
 * - AnimatedCard with stagger effect
 * - AnimatedModal with scale/opacity
 * - AnimatedList for dynamic lists
 * - Page transition variants
 * - Fade, Slide, Scale presets
 */

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ReactNode } from 'react';

// ========================================
// ANIMATION VARIANTS (Presets)
// ========================================

export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: 'easeOut' }
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.2 }
    }
};

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.3 }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 }
    }
};

export const slideInRight: Variants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, ease: 'easeOut' }
    },
    exit: {
        opacity: 0,
        x: -30,
        transition: { duration: 0.2 }
    }
};

export const slideInLeft: Variants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, ease: 'easeOut' }
    },
    exit: {
        opacity: 0,
        x: 30,
        transition: { duration: 0.2 }
    }
};

// Stagger container for children
export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        }
    }
};

// Individual stagger item
export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.35, ease: 'easeOut' }
    }
};

// Page transition
export const pageTransition: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.25, 0.1, 0.25, 1],
            when: 'beforeChildren',
            staggerChildren: 0.1
        }
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.25 }
    }
};

// Modal backdrop
export const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

// Modal content
export const modalVariants: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.9,
        y: 20
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 25,
            stiffness: 300
        }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 10,
        transition: { duration: 0.2 }
    }
};

// ========================================
// ANIMATED COMPONENTS
// ========================================

interface AnimatedCardProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    style?: React.CSSProperties;
}

/**
 * AnimatedCard - Fades in with slight upward motion
 */
export function AnimatedCard({ children, className, delay = 0, style }: AnimatedCardProps) {
    return (
        <motion.div
            variants={staggerItem}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ delay }}
            className={className}
            style={style}
        >
            {children}
        </motion.div>
    );
}

interface AnimatedGridProps {
    children: ReactNode;
    className?: string;
}

/**
 * AnimatedGrid - Container with staggered children
 */
export function AnimatedGrid({ children, className }: AnimatedGridProps) {
    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface AnimatedPageProps {
    children: ReactNode;
    className?: string;
}

/**
 * AnimatedPage - Wrap page content for smooth transitions
 */
export function AnimatedPage({ children, className }: AnimatedPageProps) {
    return (
        <motion.div
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface AnimatedListItemProps {
    children: ReactNode;
    className?: string;
    layoutId?: string;
}

/**
 * AnimatedListItem - For lists with add/remove animations
 */
export function AnimatedListItem({ children, className, layoutId }: AnimatedListItemProps) {
    return (
        <motion.div
            layout
            layoutId={layoutId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface AnimatedBadgeProps {
    children: ReactNode;
    className?: string;
    layoutId?: string;
}

/**
 * AnimatedBadge - For filter chips and tags
 */
export function AnimatedBadge({ children, className, layoutId }: AnimatedBadgeProps) {
    return (
        <motion.span
            layout
            layoutId={layoutId}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={className}
        >
            {children}
        </motion.span>
    );
}

interface AnimatedNumberProps {
    value: number;
    className?: string;
}

/**
 * AnimatedNumber - Animate number changes
 */
export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
    return (
        <motion.span
            key={value}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className={className}
        >
            {value.toLocaleString('ar-EG')}
        </motion.span>
    );
}

// ========================================
// UTILITY HOOKS
// ========================================

/**
 * Use this to wrap motion.div with common animation props
 */
export const MotionDiv = motion.div;
export const MotionSpan = motion.span;
export const MotionButton = motion.button;

// Re-export AnimatePresence for convenience
export { AnimatePresence };
