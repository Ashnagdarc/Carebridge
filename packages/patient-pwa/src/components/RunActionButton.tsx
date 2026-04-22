"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'motion/react';
import { Play } from 'lucide-react';
import { HiBadgeCheck } from 'react-icons/hi';
import { IoCloseSharp } from 'react-icons/io5';
import { FaInbox } from 'react-icons/fa6';
import { RiBubbleChartFill } from 'react-icons/ri';
import { BsFileTextFill, BsSendFill, BsTagFill, BsShieldLockFill } from 'react-icons/bs';
import { TbClockHour12Filled } from 'react-icons/tb';

function AnimatedText({
  text,
  className,
  delayStep = 0.014,
}: {
  text: string;
  className?: string;
  delayStep?: number;
}) {
  const chars = text.split('');

  return (
    <span className={className} style={{ display: 'inline-flex' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          style={{ display: 'inline-flex', willChange: 'transform' }}
        >
          {chars.map((char, i) => (
            <motion.span
              key={i}
              initial={{
                y: 10,
                opacity: 0,
                scale: 0.5,
                filter: 'blur(2px)',
              }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
              }}
              exit={{
                y: -10,
                opacity: 0,
                scale: 0.5,
                filter: 'blur(2px)',
              }}
              transition={{
                type: 'spring',
                stiffness: 240,
                damping: 16,
                mass: 1.2,
                delay: i * delayStep,
              }}
              style={{
                display: 'inline-block',
                whiteSpace: char === ' ' ? 'pre' : undefined,
              }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const spring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 22,
  mass: 0.8,
};

const DEFAULT_STEPS = [
  { id: 1, label: 'Importing Survey Data', icon: FaInbox },
  { id: 2, label: 'Refining Responses', icon: RiBubbleChartFill },
  { id: 3, label: 'Labelling Responses', icon: BsTagFill },
  { id: 4, label: 'Analyzing Sentiment', icon: TbClockHour12Filled },
  { id: 5, label: 'Creating Reports', icon: BsFileTextFill },
  { id: 6, label: 'Sharing Survey Report', icon: BsSendFill },
];

type StepItem = {
  id: number;
  label: string;
  icon: React.ComponentType<any>;
};

type RunActionButtonProps = {
  steps?: StepItem[];
  // external control (optional): parent can set `isRunning`/`isDone`
  isRunning?: boolean;
  isDone?: boolean;
  idleLabel?: string;
  // label to show while running instead of cycling steps
  runningLabel?: string;
  doneLabel?: string;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  name?: string;
  value?: string;
  ariaLabel?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onDone?: () => void;
};

export type RunActionStep = StepItem;

export function RunActionButton({
  steps = DEFAULT_STEPS,
  isRunning,
  isDone,
  runningLabel,
  idleLabel = 'Initiate',
  doneLabel = 'Done',
  fullWidth = false,
  className,
  disabled,
  type = 'button',
  form,
  name,
  value,
  ariaLabel,
  onClick,
  onDone,
}: RunActionButtonProps) {
  const [internalStatus, setInternalStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [currentStep, setCurrentStep] = useState(0);

  const controlled = typeof isRunning === 'boolean';
  const status: 'idle' | 'running' | 'done' = controlled
    ? isDone
      ? 'done'
      : isRunning
      ? 'running'
      : 'idle'
    : internalStatus;

  const startAction = () => {
    if (!controlled) {
      setInternalStatus('running');
      setCurrentStep(0);
    }
  };

  const reset = () => {
    if (!controlled) {
      setInternalStatus('idle');
      setCurrentStep(0);
    }
  };

  useEffect(() => {
    // if parent toggles isRunning on, reset step index
    if (controlled && isRunning) {
      setCurrentStep(0);
    }
  }, [controlled, isRunning]);

  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        // reached final step
        if (!controlled) {
          setInternalStatus('done');
        } else {
          if (onDone) onDone();
        }
        return prev;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [status, steps.length, controlled, onDone]);

  const widths = {
    idle: 180,
    running: 360,
    done: 200,
  };

  return (
    <div className="flex items-center justify-center">
      <motion.div
        initial={{ width: 180 }}
        animate={{ width: widths[status] }}
        transition={spring}
        className={`relative flex items-center justify-between overflow-hidden rounded-full transition-all ${status === 'running' ? 'ring-1 ring-white/10' : ''}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {status === 'idle' && (
            <motion.button
              key="idle"
              data-testid="run-action-idle"
              onClick={startAction}
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              transition={spring}
              className="flex items-center gap-2 rounded-full px-4 h-11 min-h-0 select-none bg-gradient-to-r from-zinc-900/80 to-zinc-800/70 border border-zinc-700/40 text-white shadow-sm hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-zinc-700 transition"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-700/40 ml-0">
                <Play className="h-4 w-4 text-white" />
              </span>

              <AnimatedText
                text={idleLabel}
                className="text-[16px] font-medium text-white"
              />
            </motion.button>
          )}

          {status === 'running' && (
            <motion.div
              data-testid="run-action-running"
              key="running"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              transition={spring}
              className="flex items-center justify-between gap-3 px-4 whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                    className="flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-zinc-700/40 flex items-center justify-center">
                      {React.createElement(steps[currentStep]?.icon ?? Play, {
                        className: 'w-4 h-4 text-white/90',
                      })}
                    </span>
                    <span data-testid="run-action-running-label" className="flex items-center">
                      <AnimatedText
                        text={runningLabel ?? steps[currentStep]?.label ?? idleLabel}
                        className="text-[15px] font-semibold text-white/90"
                      />
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              <motion.button
                onClick={reset}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ ...spring, delay: 0.15 }}
                className="ml-2 rounded-full bg-zinc-700/60 p-1.5 flex items-center justify-center"
                aria-label="cancel"
              >
                <IoCloseSharp className="h-4 w-4 text-white/90" />
              </motion.button>
            </motion.div>
          )}

          {status === 'done' && (
            <motion.button
              key="done"
              data-testid="run-action-done"
              onClick={reset}
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
              transition={spring}
              className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 whitespace-nowrap shadow-sm"
            >
              <HiBadgeCheck className="h-6 w-6 text-[#22c55e]" />

              <AnimatedText
                  text={doneLabel}
                  className="text-[16px] font-semibold text-white"
              />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export const authActionSteps = {
  signIn: [
    { id: 1, label: 'Checking account', icon: FaInbox },
    { id: 2, label: 'Securing session', icon: BsShieldLockFill },
    { id: 3, label: 'Opening dashboard', icon: BsSendFill },
  ],
  signUp: [
    { id: 1, label: 'Creating profile', icon: BsFileTextFill },
    { id: 2, label: 'Protecting records', icon: BsShieldLockFill },
    { id: 3, label: 'Opening CareBridge', icon: BsSendFill },
  ],
  reset: [
    { id: 1, label: 'Finding account', icon: FaInbox },
    { id: 2, label: 'Preparing reset', icon: BsShieldLockFill },
    { id: 3, label: 'Sending email', icon: BsSendFill },
  ],
} as Record<string, RunActionStep[]>;
