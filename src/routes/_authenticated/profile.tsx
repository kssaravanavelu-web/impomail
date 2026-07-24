import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, User as UserIcon, Save, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/message-list";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ImpoMail" },
      { name: "description", content: "Edit your ImpoMail profile — name, avatar and bio." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, bio")
        .eq("id", user.id)
        .maybeSingle();
      if (ignore) return;
      if (error) {
        toast.error("Could not load profile");
      } else if (data) {
        setFullName(data.full_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setBio(data.bio ?? "");
      } else {
        setFullName(
          (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "",
        );
        setAvatarUrl((user.user_metadata?.avatar_url as string | undefined) ?? "");
      }
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [user]);

  const save = async () => {
    setSaving(true);
    const trimmedName = fullName.trim();
    const trimmedAvatar = avatarUrl.trim();
    const trimmedBio = bio.trim();
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: trimmedName || null,
      avatar_url: trimmedAvatar || null,
      bio: trimmedBio || null,
    });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    // Keep auth user metadata in sync so avatar/name show elsewhere
    await supabase.auth.updateUser({
      data: { full_name: trimmedName, avatar_url: trimmedAvatar },
    });
    toast.success("Profile updated");
    setSaving(false);
  };

  const initial = (fullName || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/settings" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader title="Profile" />
        </div>
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40"
        >
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
            onError={(e) => ((e.currentTarget.style.display = "none"))}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-semibold">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-xl">{fullName || "Unnamed"}</div>
          <div className="truncate text-sm text-muted-foreground">{user.email}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Edit profile</span>
        </div>

        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="full_name">Display name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input
              id="avatar_url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              disabled={loading}
            />
            <p className="text-[11px] text-muted-foreground">
              Paste a link to any square image. Leave blank to use your initial.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A few words about you"
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email ?? ""} disabled />
            <p className="text-[11px] text-muted-foreground">
              Email is managed by your account provider.
            </p>
          </div>

          <Button
            onClick={save}
            disabled={loading || saving}
            className="w-full gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}