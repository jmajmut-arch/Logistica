import journal from './meta/_journal.json';
import m0000 from './0000_typical_dakota_north.sql';
import m0001 from './0001_spooky_spiral.sql';
import m0002 from './0002_hse_role_to_supervisor.sql';
import m0003 from './0003_low_typhoid_mary.sql';
import m0004 from './0004_rename_leftover_hse_demo_user.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};
