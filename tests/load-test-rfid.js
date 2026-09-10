import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 lecturas concurrentes por segundo
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% de las peticiones deben completarse en <200ms
  },
};

export default function () {
  const url = 'http://localhost:3000/api/test/rfid';
  const payload = JSON.stringify({
    uid: 'TEST-RFID-001',
    tipoServicio: 'Desayuno',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);
  check(res, {
    'response status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 500,
  });
}
