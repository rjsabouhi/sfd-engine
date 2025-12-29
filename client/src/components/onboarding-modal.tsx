import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Waves, Play, Sliders, Keyboard, ArrowRight, ArrowLeft, X } from "lucide-react";
import { LANGUAGE } from "@/lib/language";

const ONBOARDING_STORAGE_KEY = "sfd-onboarding-complete";

interface OnboardingStep {
  title: string;
  description: string;
  icon: typeof Waves;
}

const steps: OnboardingStep[] = [
  {
    title: LANGUAGE.ONBOARDING.WELCOME_TITLE,
    description: LANGUAGE.ONBOARDING.WELCOME_BODY.intuitive,
    icon: Waves,
  },
  {
    title: LANGUAGE.ONBOARDING.STEP2_TITLE,
    description: LANGUAGE.ONBOARDING.STEP2_DESC,
    icon: Play,
  },
  {
    title: LANGUAGE.ONBOARDING.STEP3_TITLE,
    description: LANGUAGE.ONBOARDING.STEP3_DESC,
    icon: Sliders,
  },
  {
    title: LANGUAGE.ONBOARDING.STEP4_TITLE,
    description: LANGUAGE.ONBOARDING.STEP4_DESC,
    icon: Keyboard,
  },
];

export interface OnboardingModalRef {
  replay: () => void;
}

export const OnboardingModal = forwardRef<OnboardingModalRef>(function OnboardingModal(_, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!hasCompleted) {
      setIsOpen(true);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    replay: () => {
      setCurrentStep(0);
      setIsOpen(true);
    },
  }));

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{step.title}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {LANGUAGE.ONBOARDING.STEP_OF.replace("{current}", String(currentStep + 1)).replace("{total}", String(steps.length))}
              </p>
            </div>
          </div>
          <DialogDescription className="text-sm leading-relaxed pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 pt-4">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                data-testid="button-onboarding-prev"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {LANGUAGE.ONBOARDING.BACK}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              data-testid="button-onboarding-next"
            >
              {isLastStep ? (
                LANGUAGE.ONBOARDING.GET_STARTED
              ) : (
                <>
                  {LANGUAGE.ONBOARDING.NEXT}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-onboarding-skip"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Skip onboarding</span>
        </button>
      </DialogContent>
    </Dialog>
  );
});
