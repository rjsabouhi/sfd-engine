import { useState, useEffect } from "react";
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
    description: LANGUAGE.ONBOARDING.WELCOME_BODY_INTUITIVE,
    icon: Waves,
  },
  {
    title: "Run the Simulation",
    description: "Press the 'Run Simulation' button in the sidebar to start. You'll see the field evolve in real-time as different operators work together to create patterns.",
    icon: Play,
  },
  {
    title: "Adjust Parameters",
    description: "Use the Params tab to adjust how strong each operator is. Try changing values and watch how the patterns respond. The Presets menu offers quick starting points.",
    icon: Sliders,
  },
  {
    title: "Keyboard Shortcuts",
    description: "Space = Play/Pause, B = Toggle basin overlay, D = Toggle dual view, R = Reset field. These shortcuts help you explore faster.",
    icon: Keyboard,
  },
];

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!hasCompleted) {
      setIsOpen(true);
    }
  }, []);

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
                Step {currentStep + 1} of {steps.length}
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
                Back
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
                  Next
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
}
