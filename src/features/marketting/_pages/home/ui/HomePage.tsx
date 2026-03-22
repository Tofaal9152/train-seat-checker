"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { onValue, ref, set, update } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import {
  getBogisByRoute,
  getSeatsByRouteAndBogi,
  getTrainNoByRoute,
  RouteKey,
  routeOptions,
  SeatItem,
} from "./data/seat-data";

type FirebaseSeatState = {
  occupied?: boolean;
  name?: string | null;
};

type SeatStateMap = Partial<
  Record<RouteKey, Record<string, Record<string, FirebaseSeatState>>>
>;

const RESET_PASSWORD = "tofaal9152";

const makeEmptySeats = (route: RouteKey, bogi: string) => {
  const seats = getSeatsByRouteAndBogi(route, bogi);

  return Object.fromEntries(
    seats.map((seat) => [String(seat.seat), { occupied: false, name: null }]),
  );
};

const getShortRouteLabel = (route: RouteKey) => {
  switch (route) {
    case "রাজশাহী-ঢাকা":
      return "রাজ-ঢা";
    case "ঢাকা-চট্টগ্রাম":
      return "ঢা-চট";
    case "কক্সবাজার-ঢাকা":
      return "কক্স-ঢা";
    case "কক্সবাজার-চট্টগ্রাম":
      return "কক্স-চট";
    case "চট্টগ্রাম-ঢাকা":
      return "চট-ঢা";
    case "ঢাকা-রাজশাহী":
      return "ঢা-রাজ";
    default:
      return route;
  }
};

export default function HomePage() {
  const initialRoute = routeOptions[0];
  const initialBogi = getBogisByRoute(initialRoute)[0] ?? "";

  const [route, setRoute] = useState<RouteKey>(initialRoute);
  const [bogi, setBogi] = useState<string>(initialBogi);
  const [seatsState, setSeatsState] = useState<SeatStateMap>({});
  const [selectedSeat, setSelectedSeat] = useState<SeatItem | null>(null);
  const [name, setName] = useState("");

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetRoute, setResetRoute] = useState<RouteKey>(initialRoute);
  const [resetBogi, setResetBogi] = useState<string>(initialBogi);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    const seatRef = ref(db, "seatStates");

    return onValue(seatRef, (snapshot) => {
      const data = snapshot.val();
      setSeatsState(data ?? {});
    });
  }, []);

  const bogis = useMemo(() => getBogisByRoute(route), [route]);
  const resetBogis = useMemo(() => getBogisByRoute(resetRoute), [resetRoute]);
  const trainNo = useMemo(() => getTrainNoByRoute(route), [route]);

  const seats = useMemo(() => {
    const baseSeats = getSeatsByRouteAndBogi(route, bogi);
    const firebaseSeats = seatsState?.[route]?.[bogi] ?? {};

    return baseSeats.map((seat) => {
      const liveSeat = firebaseSeats[String(seat.seat)];

      return {
        seat: seat.seat,
        occupied: liveSeat?.occupied ?? false,
        name: liveSeat?.name ?? null,
      };
    });
  }, [route, bogi, seatsState]);

  const handleRouteChange = (nextRoute: RouteKey) => {
    const nextBogis = getBogisByRoute(nextRoute);
    const firstBogi = nextBogis[0] ?? "";

    setRoute(nextRoute);
    setBogi(firstBogi);
    setSelectedSeat(null);
    setName("");
  };

  const handleResetRouteChange = (nextRoute: RouteKey) => {
    const nextBogis = getBogisByRoute(nextRoute);
    const firstBogi = nextBogis[0] ?? "";

    setResetRoute(nextRoute);
    setResetBogi(firstBogi);
  };

  const updateSeatInFirebase = async (
    currentRoute: RouteKey,
    currentBogi: string,
    seatNo: number,
    payload: { occupied: boolean; name: string | null },
  ) => {
    await update(ref(db), {
      [`seatStates/${currentRoute}/${currentBogi}/${seatNo}`]: payload,
    });
  };

  const handleSeatClick = async (seat: SeatItem) => {
    if (!seat.name) {
      setSelectedSeat(seat);
      return;
    }

    const confirmRemove = window.confirm(
      `Remove ${seat.name} from seat ${seat.seat}?`,
    );

    if (confirmRemove) {
      await updateSeatInFirebase(route, bogi, seat.seat, {
        occupied: false,
        name: null,
      });
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!selectedSeat || !trimmedName) return;

    await updateSeatInFirebase(route, bogi, selectedSeat.seat, {
      occupied: true,
      name: trimmedName,
    });

    setSelectedSeat(null);
    setName("");
  };

  const openResetDialog = () => {
    setResetRoute(route);
    setResetBogi(bogi);
    setResetPassword("");
    setResetError("");
    setResetDialogOpen(true);
  };

  const handleResetSeats = async () => {
    if (resetPassword !== RESET_PASSWORD) {
      setResetError("Invalid admin password");
      return;
    }

    const emptySeats = makeEmptySeats(resetRoute, resetBogi);

    await set(ref(db, `seatStates/${resetRoute}/${resetBogi}`), emptySeats);

    setResetDialogOpen(false);
    setResetPassword("");
    setResetError("");
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-32">
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        <div className="flex justify-between rounded-xl border bg-white p-4">
          <div>
            <h1 className="font-bold">Train Seat Tracker</h1>
            <p>{route}</p>
            <p>Train: {trainNo ?? "N/A"}</p>
          </div>

          <Button variant="destructive" onClick={openResetDialog}>
            Reset
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
          {bogis.map((b) => (
            <Button
              key={b}
              variant={b === bogi ? "default" : "outline"}
              onClick={() => setBogi(b)}
            >
              {b}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {seats.map((seat) => (
            <Card
              key={seat.seat}
              onClick={() => handleSeatClick(seat)}
              className={`cursor-pointer ${
                seat.name ? "bg-red-500 text-white" : "bg-green-500 text-white"
              }`}
            >
              <CardContent className="flex h-20 flex-col items-center justify-center">
                <div>{seat.seat}</div>
                <div>{seat.name ?? "Empty"}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog
        open={!!selectedSeat}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSeat(null);
            setName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seat {selectedSeat?.seat}</DialogTitle>
          </DialogHeader>

          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />

          <Button onClick={handleSubmit}>Confirm</Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          setResetDialogOpen(open);
          if (!open) {
            setResetPassword("");
            setResetError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Reset</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {routeOptions.map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={item === resetRoute ? "default" : "outline"}
                  onClick={() => handleResetRouteChange(item)}
                  className="h-auto whitespace-normal px-3 py-2 text-xs"
                >
                  {item}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {resetBogis.map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={item === resetBogi ? "default" : "outline"}
                  onClick={() => setResetBogi(item)}
                >
                  Bogi {item}
                </Button>
              ))}
            </div>

            <Input
              type="password"
              value={resetPassword}
              placeholder="Admin password"
              onChange={(e) => {
                setResetPassword(e.target.value);
                if (resetError) setResetError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleResetSeats();
              }}
            />

            {resetError ? <p className="text-red-500">{resetError}</p> : null}

            <Button variant="destructive" onClick={handleResetSeats}>
              Reset {resetRoute} - {resetBogi}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="supports-[backdrop-filter]:bg-white/80 fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-2 p-2 sm:grid-cols-6">
          {routeOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRouteChange(r)}
              className={`rounded-xl px-2 py-2 text-center text-[11px] font-medium transition sm:text-xs ${
                route === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <span className="block sm:hidden">{getShortRouteLabel(r)}</span>
              <span className="hidden sm:block">{r}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}