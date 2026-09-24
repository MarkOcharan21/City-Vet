export default function groupRequestsByBatch(requests = []) {
  const map = new Map();

  requests.forEach((r) => {
    const groupId = r.request_group_id || r.id;
    if (!map.has(groupId)) {
      map.set(groupId, {
        groupId,
        id: r.id,
        owner_name: r.owner_name,
        pet_name: r.pet_name,
        requested_date: r.requested_date,
        issued_date: r.issued_date,
        status: r.status,
        purpose: r.purpose,
        format: r.format,
        comments: r.comments,
        items: [],
      });
    }
    const b = map.get(groupId);
    b.items.push(r);
  });

  return [...map.values()].map((b) => {
    const types = [...new Set(b.items.map((i) => i.request_type).filter(Boolean))];
    const status = b.items.every((i) => i.status === 'Issued') ? 'Issued' : 'Pending';
    return { ...b, types, status };
  });
}
