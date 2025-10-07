import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomePage from '../views/HomePage';
import DemoTTS from "../views/DemoTTS";

export default function AppRouter() {
    return (
        <Router>
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/demo-tts" element={<DemoTTS />} />
        </Routes>
        </Router>
    );
    }
