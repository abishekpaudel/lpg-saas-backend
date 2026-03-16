/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Sort suppliers by distance from customer location
 */
const sortByDistance = (suppliers, lat, lon) => {
  return suppliers
    .map((s) => ({
      ...s,
      distance: calculateDistance(lat, lon, parseFloat(s.latitude), parseFloat(s.longitude)),
    }))
    .sort((a, b) => a.distance - b.distance);
};

module.exports = { calculateDistance, sortByDistance };
