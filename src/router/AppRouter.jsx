import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomePage from '../views/HomePage';

export default function AppRouter() {
    return (
        <Router>
        <Routes>
            <Route path="/" element={<HomePage />} />
        </Routes>
        </Router>
    );
    }
