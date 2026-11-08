// shifts the wall clock of the watch simulator processes to FAKE_HHMM local time, see capture.sh
// the fake clock wraps every 50 s so the minute never ticks over
// monotonic timers are untouched
#include <math.h>
#include <stdlib.h>
#include <string.h>
#include <sys/time.h>
#include <time.h>
#include <CoreFoundation/CoreFoundation.h>

static double offset;
static double start;

static double real_now(void) {
  struct timespec ts;
  clock_gettime(CLOCK_REALTIME, &ts);
  return ts.tv_sec + ts.tv_nsec / 1e9;
}

__attribute__((constructor)) static void init(void) {
  const char *hhmm = getenv("FAKE_HHMM");
  if (!hhmm || strlen(hhmm) != 4) return;
  start = real_now();
  time_t now = (time_t)start;
  struct tm tm;
  localtime_r(&now, &tm);
  tm.tm_hour = (hhmm[0] - '0') * 10 + (hhmm[1] - '0');
  tm.tm_min = (hhmm[2] - '0') * 10 + (hhmm[3] - '0');
  tm.tm_sec = 0;
  offset = (double)mktime(&tm) - start;
}

static double fake(double real) {
  if (!start) return real;
  double elapsed = real - start;
  return start + offset + (elapsed - 50.0 * floor(elapsed / 50.0));
}

static int my_gettimeofday(struct timeval *tv, void *tz) {
  int r = gettimeofday(tv, tz);
  if (r == 0 && tv) {
    double f = fake(tv->tv_sec + tv->tv_usec / 1e6);
    tv->tv_sec = (time_t)f;
    tv->tv_usec = (suseconds_t)((f - (time_t)f) * 1e6);
  }
  return r;
}

static int my_clock_gettime(clockid_t id, struct timespec *ts) {
  int r = clock_gettime(id, ts);
  if (r == 0 && ts && id == CLOCK_REALTIME) {
    double f = fake(ts->tv_sec + ts->tv_nsec / 1e9);
    ts->tv_sec = (time_t)f;
    ts->tv_nsec = (long)((f - (time_t)f) * 1e9);
  }
  return r;
}

static uint64_t my_clock_gettime_nsec_np(clockid_t id) {
  uint64_t r = clock_gettime_nsec_np(id);
  if (id != CLOCK_REALTIME) return r;
  return (uint64_t)(fake(r / 1e9) * 1e9);
}

static time_t my_time(time_t *t) {
  // from the fractional clock, a whole second read before start would land on the minute before
  time_t r = (time_t)fake(real_now());
  if (t) *t = r;
  return r;
}

static CFAbsoluteTime my_CFAbsoluteTimeGetCurrent(void) {
  return fake(CFAbsoluteTimeGetCurrent() + kCFAbsoluteTimeIntervalSince1970) - kCFAbsoluteTimeIntervalSince1970;
}

#define INTERPOSE(n, o) \
  __attribute__((used, section("__DATA,__interpose"))) static struct { const void *r, *o; } interpose_##o = {(const void *)n, (const void *)o};
INTERPOSE(my_gettimeofday, gettimeofday)
INTERPOSE(my_clock_gettime, clock_gettime)
INTERPOSE(my_clock_gettime_nsec_np, clock_gettime_nsec_np)
INTERPOSE(my_time, time)
INTERPOSE(my_CFAbsoluteTimeGetCurrent, CFAbsoluteTimeGetCurrent)
