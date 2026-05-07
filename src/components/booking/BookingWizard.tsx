"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import ProgressBar from "./ProgressBar";
import StepPackage from "./StepPackage";
import StepVehicle from "./StepVehicle";
import StepContact from "./StepContact";
import StepLocation from "./StepLocation";
import StepConfirm from "./StepConfirm";

export type ServiceCategory = "CarWash" | "CarDetailing" | "OneTimeCarWash";

export interface BookingData {
  service: ServiceCategory | null;
  serviceOption: string;
  pkg: "Daily" | "TriWeekly" | "OneTime" | null;
  vehicleType: string;
  carModel: string;
  carNumber: string;
  name: string;
  phone: string;
  otpVerified: boolean;
  pincode: string;
  address: string;
  date: string;
  time: string;
}

const TOTAL_STEPS = 5;

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? "55%" : "-55%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? "-55%" : "55%", opacity: 0 }),
};

export default function BookingWizard() {
  const searchParams = useSearchParams();
  const topRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<BookingData>({
    service: null,
    serviceOption: "",
    pkg: null,
    vehicleType: "",
    carModel: "",
    carNumber: "",
    name: "",
    phone: "",
    otpVerified: false,
    pincode: "",
    address: "",
    date: "",
    time: "8:00 AM",
  });

  useEffect(() => {
    const pkg = searchParams.get("package");
    if (pkg === "Daily" || pkg === "TriWeekly" || pkg === "OneTime") {
      setData((d) => ({ ...d, pkg }));
    }
  }, [searchParams]);

  function update(patch: Partial<BookingData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function next() {
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    scrollTop();
  }

  function back() {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 1));
    scrollTop();
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6" ref={topRef}>
      <ProgressBar current={step} />

      <div className="relative overflow-hidden mt-4">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8"
          >
            {step === 1 && <StepContact data={data} update={update} onNext={next} />}
            {step === 2 && <StepLocation data={data} update={update} onNext={next} onBack={back} />}
            {step === 3 && <StepVehicle data={data} update={update} onNext={next} onBack={back} />}
            {step === 4 && <StepPackage data={data} update={update} onNext={next} onBack={back} />}
            {step === 5 && <StepConfirm data={data} onBack={back} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
