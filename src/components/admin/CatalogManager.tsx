"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Plus, Waves } from "lucide-react";

interface CatalogManagerProps {
  shopId: string;
  funDives: Array<{
    id: string;
    dive_location_id: string;
    price_1_tank: number;
    price_2_tank: number;
    distance_from_shore_km: number | null;
    travel_time_mins: number | null;
    active: boolean;
    notes: string | null;
    dive_locations?: { name: string; max_depth: number | null };
  }>;
  courses: Array<{
    id: string;
    course_type_id: string;
    price: number;
    active: boolean;
    notes: string | null;
    course_types?: { name: string; duration_days: number; prerequisite_cert_level: string | null };
  }>;
  diveLocations: Array<{ id: string; name: string; max_depth: number | null }>;
  courseTypes: Array<{ id: string; name: string; duration_days: number; prerequisite_cert_level: string | null }>;
}

export default function CatalogManager({
  shopId,
  funDives: initialFunDives,
  courses: initialCourses,
  diveLocations,
  courseTypes,
}: CatalogManagerProps) {
  const [funDives, setFunDives] = useState(initialFunDives);
  const [courses, setCourses] = useState(initialCourses);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  // New fun dive form
  const [newDiveLocationId, setNewDiveLocationId] = useState(diveLocations[0]?.id ?? "");
  const [newPrice1, setNewPrice1] = useState("");
  const [newPrice2, setNewPrice2] = useState("");
  const [newDistance, setNewDistance] = useState("");
  const [newTravel, setNewTravel] = useState("");

  // New course form
  const [newCourseTypeId, setNewCourseTypeId] = useState(courseTypes[0]?.id ?? "");
  const [newCoursePrice, setNewCoursePrice] = useState("");

  async function addFunDive() {
    if (!newDiveLocationId || !newPrice1 || !newPrice2) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("shop_fun_dives")
      .insert({
        shop_id: shopId,
        dive_location_id: newDiveLocationId,
        price_1_tank: parseFloat(newPrice1),
        price_2_tank: parseFloat(newPrice2),
        distance_from_shore_km: newDistance ? parseFloat(newDistance) : null,
        travel_time_mins: newTravel ? parseInt(newTravel) : null,
        active: true,
      })
      .select("*, dive_locations(*)")
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setFunDives([...funDives, data as typeof funDives[0]]);
      setNewPrice1(""); setNewPrice2(""); setNewDistance(""); setNewTravel("");
      router.refresh();
    }
  }

  async function toggleFunDive(id: string, active: boolean) {
    await supabase.from("shop_fun_dives").update({ active }).eq("id", id);
    setFunDives(funDives.map((fd) => fd.id === id ? { ...fd, active } : fd));
  }

  async function addCourse() {
    if (!newCourseTypeId || !newCoursePrice) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("shop_courses")
      .insert({
        shop_id: shopId,
        course_type_id: newCourseTypeId,
        price: parseFloat(newCoursePrice),
        active: true,
      })
      .select("*, course_types(*)")
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCourses([...courses, data as typeof courses[0]]);
      setNewCoursePrice("");
      router.refresh();
    }
  }

  async function toggleCourse(id: string, active: boolean) {
    await supabase.from("shop_courses").update({ active }).eq("id", id);
    setCourses(courses.map((c) => c.id === id ? { ...c, active } : c));
  }

  return (
    <Tabs defaultValue="fun-dives">
      <TabsList>
        <TabsTrigger value="fun-dives">Fun Dives</TabsTrigger>
        <TabsTrigger value="courses">Courses</TabsTrigger>
      </TabsList>

      <TabsContent value="fun-dives" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Fun Dive</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label>Location</Label>
                <Select value={newDiveLocationId} onValueChange={setNewDiveLocationId}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {diveLocations.map((dl) => (
                      <SelectItem key={dl.id} value={dl.id}>{dl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>1-Tank Price ($)</Label>
                <Input type="number" value={newPrice1} onChange={(e) => setNewPrice1(e.target.value)} placeholder="45" />
              </div>
              <div className="space-y-1.5">
                <Label>2-Tank Price ($)</Label>
                <Input type="number" value={newPrice2} onChange={(e) => setNewPrice2(e.target.value)} placeholder="80" />
              </div>
              <div className="space-y-1.5">
                <Label>Distance from shore (km)</Label>
                <Input type="number" value={newDistance} onChange={(e) => setNewDistance(e.target.value)} placeholder="2.5" />
              </div>
              <div className="space-y-1.5">
                <Label>Travel time (mins)</Label>
                <Input type="number" value={newTravel} onChange={(e) => setNewTravel(e.target.value)} placeholder="30" />
              </div>
            </div>
            <Button size="sm" onClick={addFunDive}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Fun Dive
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {funDives.map((fd) => (
            <div key={fd.id} className={`flex items-center justify-between p-4 bg-white border rounded-lg ${!fd.active && "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <Waves className="h-5 w-5 text-ocean-500" />
                <div>
                  <div className="font-medium">{fd.dive_locations?.name ?? "Unknown"}</div>
                  <div className="text-sm text-gray-500">
                    1-tank: ${fd.price_1_tank} · 2-tank: ${fd.price_2_tank}
                    {fd.travel_time_mins && ` · ${fd.travel_time_mins} min away`}
                    {fd.dive_locations?.max_depth && ` · ${fd.dive_locations.max_depth}m max`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={fd.active ? "success" : "outline"}>
                  {fd.active ? "Active" : "Inactive"}
                </Badge>
                <Switch checked={fd.active} onCheckedChange={(v) => toggleFunDive(fd.id, v)} />
              </div>
            </div>
          ))}
          {funDives.length === 0 && (
            <p className="text-center text-gray-500 py-8">No fun dives added yet.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="courses" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Course Type</Label>
                <Select value={newCourseTypeId} onValueChange={setNewCourseTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courseTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.name} ({ct.duration_days} days)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Price ($)</Label>
                <Input type="number" value={newCoursePrice} onChange={(e) => setNewCoursePrice(e.target.value)} placeholder="350" />
              </div>
            </div>
            <Button size="sm" onClick={addCourse}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Course
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {courses.map((c) => (
            <div key={c.id} className={`flex items-center justify-between p-4 bg-white border rounded-lg ${!c.active && "opacity-60"}`}>
              <div>
                <div className="font-medium">{c.course_types?.name ?? "Unknown"}</div>
                <div className="text-sm text-gray-500">
                  {c.course_types?.duration_days} days · ${c.price}
                  {c.course_types?.prerequisite_cert_level &&
                    ` · Requires: ${c.course_types.prerequisite_cert_level.replace("_", " ")}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.active ? "success" : "outline"}>
                  {c.active ? "Active" : "Inactive"}
                </Badge>
                <Switch checked={c.active} onCheckedChange={(v) => toggleCourse(c.id, v)} />
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <p className="text-center text-gray-500 py-8">No courses added yet.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
