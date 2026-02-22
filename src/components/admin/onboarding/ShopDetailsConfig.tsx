"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

interface ShopDetailsConfigProps {
  shopId: string;
  shop: {
    name?: string;
    location?: string;
    phone?: string;
    email?: string;
  } | null;
}

export default function ShopDetailsConfig({ shopId, shop }: ShopDetailsConfigProps) {
  const [name, setName] = useState(shop?.name ?? "");
  const [location, setLocation] = useState(shop?.location ?? "");
  const [phone, setPhone] = useState(shop?.phone ?? "");
  const [email, setEmail] = useState(shop?.email ?? "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    setLoading(true);
    const { error } = await supabase
      .from("shops")
      .update({ name, location, phone, email })
      .eq("id", shopId);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Shop details saved!" });
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Details</CardTitle>
        <CardDescription>Basic information about your dive shop.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Coral Reef Divers"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-location">Location</Label>
            <Input
              id="shop-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Koh Tao, Thailand"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-phone">Phone</Label>
            <Input
              id="shop-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+66 77 456 789"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-email">Email</Label>
            <Input
              id="shop-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@diveshop.com"
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Shop Details"}
        </Button>
      </CardContent>
    </Card>
  );
}
