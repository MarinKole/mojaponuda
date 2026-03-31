"use client";

import { useEffect, useState } from "react";
import { FollowButton, ChecklistButton } from "./opportunity-actions";

interface Props {
  opportunityId: string;
  signupHrefFollow: string;
  signupHrefChecklist: string;
}

export function OpportunityActionsWrapper({ opportunityId, signupHrefFollow, signupHrefChecklist }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Quick check: try the follow API — if it returns 401 we're not logged in
    fetch(`/api/opportunities/${opportunityId}/follow`)
      .then((r) => {
        if (r.status === 401) setIsLoggedIn(false);
        else setIsLoggedIn(true);
      })
      .catch(() => setIsLoggedIn(false));
  }, [opportunityId]);

  if (isLoggedIn === null) {
    return null; // loading
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-wrap gap-3">
        <a
          href={signupHrefFollow}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-blue-700 transition-colors"
        >
          Prati ovu priliku
        </a>
        <a
          href={signupHrefChecklist}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Generiraj checklistu prijave
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <FollowButton opportunityId={opportunityId} />
      <ChecklistButton opportunityId={opportunityId} />
    </div>
  );
}
