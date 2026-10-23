import { createContext, useContext, useState } from 'react';
import { agentPortalApi, agentSession } from './agentApi';

const AgentAuth = createContext(null);
export const useAgentAuth = () => useContext(AgentAuth);

export function AgentAuthProvider({ children }) {
    const [user, setUser] = useState(agentSession.user());
    const login = async (email, password) => {
        const r = await agentPortalApi.login(email, password);
        const d = r.data?.data || r.data;
        agentSession.save(d.token, d.user);
        setUser(d.user);
        return d.user;
    };
    const update = (patch) => {
        const next = { ...user, ...patch };
        agentSession.save(null, next);
        setUser(next);
    };
    const logout = () => { agentSession.clear(); setUser(null); };
    return <AgentAuth.Provider value={{ user, login, logout, update }}>{children}</AgentAuth.Provider>;
}

