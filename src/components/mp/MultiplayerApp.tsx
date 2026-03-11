"use client";

import * as React from "react";
import {
  ArrowRight,
  Crown,
  Link as LinkIcon,
  LogOut,
  PlugZap,
  Swords,
  Timer,
  Trophy,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useMpStore, isHost, type RoomState, type RoundCriterion } from "@/state/mpStore";
import { formatSeconds } from "@/lib/gameLogic.mjs";

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <span className={["chip text-xs font-semibold", strong ? "chip-strong" : ""].join(" ")}>{children}</span>;
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lbc-navy text-white shadow-punch anim-float">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-title truncate text-xl font-black tracking-tight">{title}</div>
        {subtitle ? <div className="text-sm text-lbc-navy/65">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function CriteriaView({ criteria, tolerance }: { criteria: RoundCriterion[]; tolerance: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {criteria.map((c) => (
        <div key={c.key} className="rounded-blob border border-lbc-navy/10 bg-white/65 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-lbc-navy/60">{c.label}</div>
          <div className="mt-1 font-title text-2xl font-black text-lbc-navy">
            {c.kind === "range" ? (
              <>
                {c.target.min} <span className="text-lbc-navy/40">→</span> {c.target.max}
              </>
            ) : (
              <>
                {c.kind === "max" ? "≤ " : "≥ "}
                {c.target.toLocaleString("fr-FR")} {c.unit}
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip strong>tolérance ±{Math.round(tolerance * 100)}%</Chip>
            <Chip>{c.kind === "max" ? "plutôt près du max" : c.kind === "min" ? "plutôt près du min" : "plutôt au milieu"}</Chip>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopBar({ room }: { room: RoomState | null }) {
  const wsStatus = useMpStore((s) => s.wsStatus);
  const wsError = useMpStore((s) => s.wsError);
  const clearError = useMpStore((s) => s.clearError);
  const leaveRoom = useMpStore((s) => s.leaveRoom);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="card rounded-blob p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-lbc-orange" />
            <span className="text-sm font-semibold text-lbc-navy">Connexion:</span>
            <Chip strong={wsStatus === "connected"}>{wsStatus}</Chip>
            {room ? (
              <>
                <span className="text-sm text-lbc-navy/50">|</span>
                <span className="text-sm font-semibold text-lbc-navy">Partie:</span>
                <span className="chip chip-strong text-sm font-black">{room.id}</span>
              </>
            ) : null}
          </div>
          {room ? (
            <Button onClick={leaveRoom} variant="ghost">
              <LogOut className="h-4 w-4" />
              Quitter
            </Button>
          ) : null}
        </div>
        {wsError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-800">
            <div className="flex items-center justify-between gap-2">
              <span>{wsError}</span>
              <button className="focus-ring rounded-xl px-2 py-1 text-xs font-black" onClick={clearError}>
                OK
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Welcome() {
  const name = useMpStore((s) => s.name);
  const setName = useMpStore((s) => s.setName);
  const connect = useMpStore((s) => s.connect);
  const wsStatus = useMpStore((s) => s.wsStatus);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 anim-pop">
      <section className="card rounded-blob p-8">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-lbc-orange text-white shadow-punch anim-float">
            <Swords className="h-7 w-7" />
          </div>
          <h1 className="font-title mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-lbc-navy via-lbc-orange to-lbc-navy bg-clip-text text-transparent anim-shimmer">
              La Pépite de l&apos;Enfer
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-lbc-navy/70 sm:text-base">
            Multijoueur LAN: crée ou rejoins une partie, puis colle une URL Leboncoin par manche.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-xl gap-3">
          <label className="rounded-blob border border-lbc-navy/10 bg-white/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-lbc-navy/60">Pseudo</div>
            <div className="mt-2 flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Zoé"
                onKeyDown={(e) => {
                  if (e.key === "Enter") connect();
                }}
              />
              <Button onClick={connect} disabled={!name || wsStatus !== "disconnected"} className="shrink-0">
                Se connecter
              </Button>
            </div>
          </label>

          <div className="text-xs text-lbc-navy/60">
            Astuce: pour jouer à plusieurs téléphones, lance le serveur sur un PC du réseau et ouvre l&apos;IP du PC depuis les mobiles.
          </div>
        </div>
      </section>
    </div>
  );
}

function Lobby() {
  const createRoom = useMpStore((s) => s.createRoom);
  const joinRoom = useMpStore((s) => s.joinRoom);
  const wsStatus = useMpStore((s) => s.wsStatus);
  const [code, setCode] = React.useState("");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 anim-pop">
      <section className="card rounded-blob p-8">
        <SectionTitle icon={<Users className="h-5 w-5" />} title="Lobby" subtitle="Créer une partie ou rejoindre avec un code." />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-blob border border-lbc-navy/10 bg-white/60 p-6">
            <div className="font-title text-2xl font-black">Créer</div>
            <p className="mt-1 text-sm text-lbc-navy/65">Tu seras le Maître du Jeu.</p>
            <div className="mt-4">
              <Button onClick={createRoom} disabled={wsStatus !== "connected"} size="lg" className="w-full">
                Créer une partie
              </Button>
            </div>
          </div>

          <div className="rounded-blob border border-lbc-navy/10 bg-white/60 p-6">
            <div className="font-title text-2xl font-black">Rejoindre</div>
            <p className="mt-1 text-sm text-lbc-navy/65">Entre le code (6 caractères).</p>
            <div className="mt-4 flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ex: A7K3Q9" />
              <Button onClick={() => joinRoom(code)} disabled={wsStatus !== "connected" || code.trim().length < 6}>
                Rejoindre
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LobbyRoom({ room }: { room: RoomState }) {
  const clientId = useMpStore((s) => s.clientId);
  const host = isHost(room, clientId);
  const claimHost = useMpStore((s) => s.claimHost);
  const setTimerSec = useMpStore((s) => s.setTimerSec);
  const startRound = useMpStore((s) => s.startRound);
  const nextRound = (room.round?.index ?? 0) + 1;
  const canStart = host && room.players.length >= 2 && nextRound <= room.settings.totalRounds;
  const hostPlayer = room.players.find((p) => p.id === room.hostId) || null;
  const hostDisconnected = !!hostPlayer && !hostPlayer.connected;
  const needPlayers = room.players.length < 2;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 anim-pop">
      <section className="card rounded-blob p-6">
        <SectionTitle
          icon={<Users className="h-5 w-5" />}
          title={`Partie ${room.id}`}
          subtitle={host ? "Tu es le Maître du Jeu. Configure et lance la manche." : "En attente du Maître du Jeu."}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-blob border border-lbc-navy/10 bg-white/60 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="font-title text-2xl font-black">Joueurs</div>
              <Chip>
                {room.players.length}/6
              </Chip>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {room.players.map((p) => (
                <div key={p.id} className="rounded-blob border border-lbc-navy/10 bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate font-black text-lbc-navy">{p.name}</div>
                    <span className={["h-2 w-2 rounded-full", p.connected ? "bg-emerald-500" : "bg-gray-400"].join(" ")} />
                  </div>
                  <div className="mt-1 text-xs text-lbc-navy/65">Score total: {p.totalScore}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-blob border border-lbc-navy/10 bg-white/60 p-6">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-lbc-orange" />
              <div className="font-title text-2xl font-black">Timer</div>
            </div>
            <p className="mt-1 text-sm text-lbc-navy/65">
              MJ: <span className="font-semibold">{hostPlayer ? hostPlayer.name : "—"}</span>{" "}
              {hostPlayer ? (
                <span className={["ml-2", hostPlayer.connected ? "text-emerald-700" : "text-red-700"].join(" ")}>
                  ({hostPlayer.connected ? "connecté" : "déconnecté"})
                </span>
              ) : null}
            </p>

            <div className="mt-4 rounded-2xl border border-lbc-navy/10 bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-lbc-navy">Durée</span>
                <span className="chip chip-strong text-sm font-black">{Math.round(room.settings.timerSec / 60)} min</span>
              </div>
              <input
                className="mt-3 w-full accent-[rgb(var(--lbc-orange))]"
                type="range"
                min={5 * 60}
                max={10 * 60}
                step={30}
                value={room.settings.timerSec}
                onChange={(e) => setTimerSec(Number(e.target.value))}
                disabled={!host}
              />
              <div className="mt-3 text-xs text-lbc-navy/60">Tolérance: ±10% sur chaque critère.</div>
            </div>

            <div className="mt-5">
              {host ? (
                <>
                  <Button onClick={startRound} disabled={!canStart} size="lg" className="w-full">
                    Lancer la manche {nextRound}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {!canStart ? (
                    <div className="mt-2 text-xs text-lbc-navy/60">
                      {needPlayers ? "Il faut au moins 2 joueurs pour démarrer." : "La partie est terminée ou invalide."}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl border border-lbc-navy/10 bg-white/70 p-4 text-sm text-lbc-navy/75">
                  <div className="font-semibold">En attente</div>
                  <div className="mt-1">Seul le Maître du Jeu peut lancer la manche.</div>
                  {hostDisconnected ? (
                    <div className="mt-3">
                      <Button onClick={claimHost} variant="primary" className="w-full">
                        Devenir Maître du Jeu
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <div className="mt-2 text-xs text-lbc-navy/60">
                        L&apos;hôte est déconnecté: quelqu&apos;un doit reprendre la main.
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RoundPlay({ room }: { room: RoomState }) {
  const clientId = useMpStore((s) => s.clientId);
  const submitUrl = useMpStore((s) => s.submitUrl);
  const finish = useMpStore((s) => s.finish);

  const me = room.players.find((p) => p.id === clientId) || null;
  const [url, setUrl] = React.useState(me?.url || "");

  React.useEffect(() => {
    setUrl(me?.url || "");
  }, [me?.url]);

  const cleanLocalUrl = url.trim();
  const cleanServerUrl = (me?.url || "").trim();
  const urlDirty = cleanLocalUrl !== cleanServerUrl;

  function saveUrl() {
    submitUrl(cleanLocalUrl);
  }

  function finishWithUrl() {
    // Most players will paste then click "Terminer" immediately.
    // Ensure the URL is submitted before finishing so scoring sees it.
    submitUrl(cleanLocalUrl);
    finish();
  }

  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const round = room.round!;
  const remainingSec = Math.max(0, Math.ceil((round.endsAt - nowMs) / 1000));
  const urgent = remainingSec <= 20;
  const ratio = Math.max(0, Math.min(1, remainingSec / Math.max(1, room.settings.timerSec)));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 anim-pop">
      <section className={["card rounded-blob p-6", urgent ? "anim-glow" : ""].join(" ")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionTitle icon={<Swords className="h-5 w-5" />} title={`Manche ${round.index}`} subtitle="Trouve une annonce réelle et colle l'URL." />
          <div className={["font-title text-4xl font-black tabular-nums", urgent ? "text-red-700 anim-wobble" : "text-lbc-navy"].join(" ")}>
            {formatSeconds(remainingSec)}
          </div>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-lbc-navy/10 shadow-inner">
          <div className={["h-full rounded-full", urgent ? "bg-red-600" : "bg-lbc-orange"].join(" ")} style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>

        <div className="mt-5">
          <CriteriaView criteria={round.criteria} tolerance={round.tolerance} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="card rounded-blob p-6">
          <SectionTitle icon={<LinkIcon className="h-5 w-5" />} title="Ton lien" subtitle="Colle l'URL Leboncoin, puis termine." />
          <div className="mt-4 grid gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => {
                // Low-friction: auto-save if the user clicks away.
                if (urlDirty) saveUrl();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") finishWithUrl();
              }}
              placeholder="https://www.leboncoin.fr/..."
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveUrl} variant="ghost" disabled={!urlDirty}>
                {urlDirty ? "Enregistrer" : "Enregistré"}
              </Button>
              <Button onClick={finishWithUrl} disabled={!me || me.finished} className="ml-auto">
                Terminer
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-lbc-navy/60">
              Si tout le monde clique “Terminer” avant la fin, la manche s’arrête immédiatement.
            </div>
          </div>
        </section>

        <section className="card rounded-blob p-6">
          <SectionTitle icon={<Users className="h-5 w-5" />} title="Statut" subtitle="Qui a terminé ?" />
          <div className="mt-4 grid gap-2">
            {room.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-blob border border-lbc-navy/10 bg-white/65 px-4 py-3">
                <div className="min-w-0 truncate font-semibold text-lbc-navy">{p.name}</div>
                <Chip strong={p.finished}>{p.finished ? "Terminé" : "En chasse"}</Chip>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Review({ room }: { room: RoomState }) {
  const clientId = useMpStore((s) => s.clientId);
  const host = isHost(room, clientId);
  const reviewNext = useMpStore((s) => s.reviewNext);

  const review = room.review!;
  const currentPlayerId = review.order[Math.min(review.index, review.order.length - 1)];
  const player = room.players.find((p) => p.id === currentPlayerId) || room.players[0];

  const ranking = [...room.players].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 anim-pop">
      <section className="card rounded-blob p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionTitle icon={<Trophy className="h-5 w-5" />} title="Résultats" subtitle="Analyse simulée des URLs (données extraites de façon déterministe)." />
          <Chip>
            {Math.min(review.index + 1, review.order.length)}/{review.order.length}
          </Chip>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="card rounded-blob p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-title truncate text-2xl font-black">{player.name}</div>
              <div className="mt-1 text-sm text-lbc-navy/65">
                Score manche: <span className="font-black text-lbc-navy">{player.roundScore ?? 0}</span> pts
                {player.roundResult?.valid ? null : <span className="ml-2 text-red-700 font-semibold">(hors tolérance)</span>}
              </div>
            </div>
            {host ? (
              <Button onClick={reviewNext} size="lg">
                Suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Chip>Le MJ passe</Chip>
            )}
          </div>

          <div className="mt-4 rounded-blob border border-lbc-navy/10 bg-white/60 p-4 text-sm text-lbc-navy/75">
            <div className="font-semibold">URL</div>
            <div className="mt-1 break-words text-xs">{player.roundResult?.url || "—"}</div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {player.roundResult?.extracted ? (
              <>
                <div className="rounded-blob border border-lbc-navy/10 bg-white/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-lbc-navy/60">Prix</div>
                  <div className="font-title text-2xl font-black">{player.roundResult.extracted.price.toLocaleString("fr-FR")} €</div>
                </div>
                <div className="rounded-blob border border-lbc-navy/10 bg-white/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-lbc-navy/60">KM</div>
                  <div className="font-title text-2xl font-black">{player.roundResult.extracted.km.toLocaleString("fr-FR")} km</div>
                </div>
                <div className="rounded-blob border border-lbc-navy/10 bg-white/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-lbc-navy/60">Puissance</div>
                  <div className="font-title text-2xl font-black">{player.roundResult.extracted.hp} ch</div>
                </div>
                <div className="rounded-blob border border-lbc-navy/10 bg-white/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-lbc-navy/60">Année</div>
                  <div className="font-title text-2xl font-black">{player.roundResult.extracted.year}</div>
                </div>
              </>
            ) : (
              <div className="rounded-blob border border-red-200 bg-red-50/70 p-4 text-sm text-red-800">
                Aucun lien.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-blob border border-lbc-navy/10 bg-white/60 p-4">
            <div className="text-sm font-semibold text-lbc-navy">Détail critères</div>
            <div className="mt-3 grid gap-2">
              {(player.roundResult?.breakdown || []).map((b) => (
                <div key={b.key} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-lbc-navy/10 bg-white/70 px-3 py-2 text-sm">
                  <div className="font-semibold">{b.label}</div>
                  <div className="flex items-center gap-2">
                    <Chip strong={b.within}>{b.within ? "OK" : "Hors tol"}</Chip>
                    <Chip>{b.score} / 100</Chip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card rounded-blob p-6">
          <SectionTitle icon={<Crown className="h-5 w-5" />} title="Classement" subtitle="Total cumulé." />
          <div className="mt-4 grid gap-2">
            {ranking.map((p, idx) => (
              <div key={p.id} className={["flex items-center justify-between rounded-blob border border-lbc-navy/10 bg-white/65 px-4 py-3", idx === 0 ? "shadow-punch" : ""].join(" ")}>
                <div className="min-w-0 truncate font-black text-lbc-navy">
                  #{idx + 1} {p.name}
                </div>
                <div className="font-title text-2xl font-black text-lbc-navy">{p.totalScore}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FinalScores({ room }: { room: RoomState }) {
  const ranking = [...room.players].sort((a, b) => b.totalScore - a.totalScore);
  const winner = ranking[0] || null;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 anim-pop">
      <section className="card rounded-blob p-8">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-lbc-navy text-white shadow-punch anim-float">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="font-title mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-lbc-orange via-amber-300 to-lbc-orange bg-clip-text text-transparent anim-shimmer">
              Scores finaux
            </span>
          </h1>
          {winner ? (
            <p className="mt-3 text-sm text-lbc-navy/70 sm:text-base">
              Champion du mauvais goût: <span className="font-black text-lbc-navy">{winner.name}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid gap-3">
          {ranking.map((p, idx) => (
            <div
              key={p.id}
              className={[
                "flex items-center justify-between rounded-blob border border-lbc-navy/10 bg-white/70 px-5 py-4",
                idx === 0 ? "shadow-punch anim-pop" : ""
              ].join(" ")}
            >
              <div className="min-w-0 truncate font-title text-2xl font-black text-lbc-navy">
                #{idx + 1} {p.name}
              </div>
              <div className="font-title text-4xl font-black text-lbc-orange tabular-nums">{p.totalScore}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MultiplayerApp() {
  const wsStatus = useMpStore((s) => s.wsStatus);
  const room = useMpStore((s) => s.room);

  if (wsStatus === "disconnected") return <Welcome />;

  return (
    <div className="min-h-screen">
      <TopBar room={room} />
      {!room ? (
        <Lobby />
      ) : room.phase === "lobby" ? (
        <LobbyRoom room={room} />
      ) : room.phase === "round" ? (
        <RoundPlay room={room} />
      ) : room.phase === "review" ? (
        <Review room={room} />
      ) : (
        <FinalScores room={room} />
      )}
    </div>
  );
}
