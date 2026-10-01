"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Go } from "@/components/store/provider";

type OrderResult = { paid?: boolean; error?: string; reference?: string };

export default function Order() {
  return (
    <Suspense>
      <Status />
    </Suspense>
  );
}

function Status() {
  const params = useSearchParams();
  const id = params.get("session_id");
  // Key the verification request so an old order result cannot appear for a new ID.
  return <Verification key={id || "missing"} id={id} />;
}

function Verification({ id }: { id: string | null }) {
  const [result, setResult] = useState<OrderResult>(() =>
    id ? {} : { error: "There is no order to verify." },
  );
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetch(`/api/order?session_id=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<OrderResult>)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({
            error: "We could not verify this order. Please contact the studio.",
          });
      });
    return () => controller.abort();
  }, [id]);

  return (
    <main id="main" className="page-shell confirmation">
      <p className="eyebrow">VYRN / ORDER STATUS</p>
      <h1>
        {result.paid
          ? "Your order is confirmed."
          : result.error
            ? "Order not confirmed."
            : "Checking your payment…"}
      </h1>
      <p role="status">
        {result.paid
          ? `Thank you. Your reference is ${result.reference}.`
          : result.error ||
            "Please keep this page open while we verify your payment."}
      </p>
      <Go href="/collection" className="button">
        Return to the collection
      </Go>
    </main>
  );
}
