import { type Place } from '../lib/api';
import { MapPinIcon, StarIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid';

interface Props {
  places: Place[];
}

export function RestaurantCards({ places }: Props) {
  if (places.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {places.map((p) => (
        <RestaurantCard key={p.id || `${p.name}-${p.address}`} place={p} />
      ))}
    </div>
  );
}

function RestaurantCard({ place }: { place: Place }) {
  const mapsHref =
    place.url ||
    (place.lat && place.lng
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`);

  return (
    <div className="rounded-xl border border-zinc-950/5 bg-white p-3.5 shadow-sm transition hover:border-orange-500/40 hover:shadow-md dark:border-white/5 dark:bg-zinc-900/40">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {place.name}
        </h3>
        {place.rating > 0 && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <StarIcon className="h-3 w-3" />
            {place.rating.toFixed(1)}
          </span>
        )}
      </div>
      {place.address && (
        <p className="mt-2 flex items-start gap-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
          <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{place.address}</span>
        </p>
      )}
      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
      >
        Google Maps で開く
        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
      </a>
    </div>
  );
}
