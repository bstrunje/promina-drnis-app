import React, { useState } from 'react';
import { API_URL } from '../../utils/config'; // Adjust this import based on where you define API_URL

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = async (username: string, password: string) => {
    try {
      console.log('Attempting to fetch:', `${API_URL}/auth/login`);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
  localStorage.setItem('token', data.token);
  alert('Login successful!');
} else {
  const errorData = await response.json();
  console.error('Login failed:', errorData);
  alert(`Login failed: ${errorData.message || 'Unknown error'}`); // Replace this with better error handling
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(`An error occurred: ${error.message}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;