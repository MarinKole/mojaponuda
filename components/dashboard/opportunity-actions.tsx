"use client";

import { useState, useEffect } from "react";
import { Heart, Loader2 } from "lucide-react";

interface FollowButtonProps {
  opportunityId: string;
}

export function FollowButton({ opportunityId }: FollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch(`/api/opportunities/${opportunityId}/follow`)
      .then((r) => r.json())
      .then((d) => setFollowing(d.following))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [opportunityId]);

  const toggle = async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      const data = await res.json();
      setFollowing(data.following);
    } catch {}
    setToggling(false);
  };

  if (loading) {
    return (
      <button disabled className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 text-slate-400">
        <Loader2 className="size-4 animate-spin" />
        Učitavanje...
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={toggling}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
        following
          ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          : "bg-slate-900 text-white hover:bg-blue-700"
      }`}
    >
      {toggling ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Heart className={`size-4 ${following ? "fill-red-500" : ""}`} />
      )}
      {following ? "Prestani pratiti" : "Prati ovu priliku"}
    </button>
  );
}
