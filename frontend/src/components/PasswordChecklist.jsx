import { getPasswordChecks } from '../utils/validation';

export default function PasswordChecklist({ password }) {
  const checks = [
    { label: 'At least 8 characters', valid: getPasswordChecks(password).minLength },
    { label: 'One uppercase letter', valid: getPasswordChecks(password).uppercase },
    { label: 'One lowercase letter', valid: getPasswordChecks(password).lowercase },
    { label: 'One number', valid: getPasswordChecks(password).number },
    { label: 'One special character', valid: getPasswordChecks(password).special },
  ];

  if (!password) return null;

  return (
    <div className="password-checklist">
      <h4>Password Requirements</h4>
      {checks.map((item) => (
        <div
          key={item.label}
          className={`password-checklist-item ${item.valid ? 'is-valid' : 'is-invalid'}`}
        >
          <span>{item.valid ? '✔' : '✖'}</span>
          {item.label}
        </div>
      ))}
    </div>
  );
}
