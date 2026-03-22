const fs = require('fs');
const path = require('path');

const directoriesToScan = ['app', 'features', 'components'];
const fileExtensions = ['.js', '.jsx'];

const replacements = [
  { from: /@\/components\/AuthProvider/g, to: '@/features/auth/components/AuthProvider' },
  { from: /@\/components\/admin\//g, to: '@/features/admin/components/' },
  { from: /@\/components\/driver\//g, to: '@/features/driver/components/' },
  { from: /@\/components\/streaming\/VideoPlayer/g, to: '@/features/streaming/components/VideoPlayer' },
  { from: /@\/components\/ui\/StreamPlayer/g, to: '@/features/streaming/components/StreamPlayer' },
  { from: /@\/context\/StreamContext/g, to: '@/features/streaming/context/StreamContext' },
  { from: /@\/components\/MockMap/g, to: '@/features/tracking/components/MockMap' },
  { from: /@\/components\/ui\/LiveMap/g, to: '@/features/tracking/components/LiveMap' },
  { from: /@\/context\/TripContext/g, to: '@/features/tracking/context/TripContext' },
  { from: /@\/components\/ProfileView/g, to: '@/features/profile/components/ProfileView' },
  { from: /@\/components\/AttendanceView/g, to: '@/features/attendance/components/AttendanceView' }
];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (fileExtensions.includes(path.extname(fullPath))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      replacements.forEach(rep => {
        if (rep.from.test(content)) {
            content = content.replace(rep.from, rep.to);
            changed = true;
        }
      });
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  });
}

directoriesToScan.forEach(dir => {
  if (fs.existsSync(dir)) scanDir(dir);
});
console.log('Done refactoring imports.');
