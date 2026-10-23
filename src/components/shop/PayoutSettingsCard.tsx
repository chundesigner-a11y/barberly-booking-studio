import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser, useProfile } from "@/components/RequireAuth";

/** Shop-level payout settings — written to the signed-in user's own profiles row. */
export function PayoutSettingsCard() {
  const user = useAuthUser();
  const { profile, refreshProfile } = useProfile();
  const [shopName, setShopName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setShopName(profile?.display_name ?? "");
    setAccountName(profile?.bank_account_name ?? "");
    setAccountNumber(profile?.bank_account_number ?? "");
  }, [profile]);

  const complete = Boolean(
    profile?.display_name && profile.bank_account_name && profile.bank_account_number,
  );
  const canSave = shopName.trim() !== "" && accountName.trim() !== "" && accountNumber.trim() !== "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) {
      toast.error("店名、戶名、帳號都是必填 / All three fields are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: shopName.trim(),
        bank_account_name: accountName.trim(),
        bank_account_number: accountNumber.trim(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("撥款設定已儲存 / Payout settings saved");
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-3xl">撥款設定 / Payout settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            你的理髮店收款的銀行帳戶 / the bank account where your shop gets paid
          </p>
        </div>
        <span
          className={
            complete
              ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
              : "rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
          }
        >
          {complete ? "已完成 ✓" : "尚未完成"}
        </span>
      </div>

      <p className="mt-4 rounded-xl bg-muted px-4 py-2 text-xs text-muted-foreground">
        先用測試資料即可 / use test data first
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="shop-name">店名 Shop name *</Label>
          <Input
            id="shop-name"
            required
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="Downtown Cuts"
          />
          <p className="text-xs text-muted-foreground">
            你的理髮店名稱，會顯示在撥款紀錄上 / your shop's name, shown on payout records
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bank-name">匯款戶名 Account name *</Label>
          <Input
            id="bank-name"
            required
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="王小明"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bank-number">匯款帳號 Account number *</Label>
          <Input
            id="bank-number"
            required
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="000-1234567890"
          />
        </div>
        <div className="md:col-span-3">
          <Button type="submit" disabled={saving || !canSave} className="rounded-full px-6">
            {saving ? "儲存中…" : "儲存撥款設定 / Save"}
          </Button>
        </div>
      </form>
    </section>
  );
}
