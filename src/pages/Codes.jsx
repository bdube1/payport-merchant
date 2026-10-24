import CodesQr from '../components/CodesQr';
import { codesApi } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';

export default function Codes() {
    const { user } = useAuth();
    return <CodesQr word="Merchant" owner={user?.merchantName || 'Merchant'} api={codesApi} />;
}
