import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function RegistrationRecords() {
  const [pets, setPets] = useState([]);

  useEffect(() => {
    api.get('/pets').then((res) => setPets(res.data.pets));
  }, []);

  return (
    <div className="page">
      <h1>Registration Records</h1>
      <p>Tracks all pets registered and their progress through verification and QR generation.</p>

      <table className="data-table">
        <thead>
          <tr><th>Pet</th><th>Owner</th><th>Verification Status</th><th>QR Code</th></tr>
        </thead>
        <tbody>
          {pets.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.owner_name}</td>
              <td><StatusBadge status={p.status} /></td>
              <td>{p.status === 'Verified' ? 'Generated' : 'Not yet generated'}</td>
            </tr>
          ))}
          {pets.length === 0 && <tr><td colSpan="4">No registration records yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
