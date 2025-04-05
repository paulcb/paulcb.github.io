
export let PROCESS_KEY_CODE = `
# process next cache request
def process_key(self, conn, key, count, threadNumber):
  stime = time.time()
  # is there a key already in the cache
  if conn.exists(key):
      value = json.loads(conn.get(key))
      self.log_cache(threadNumber, count, stime, key, value, True)
  else:
      # no key in the cache, so now grab the database value and populate the cache
      value = fetch_data(self.table_name, key, self.Session)
      self.log_cache(threadNumber, count, stime,
                      key, value, False)
      conn.set(key, json.dumps(value))
  `;

export let DOCKER_COMPOSE_CODE = `

  services:
  postgresql-cache-test:
    build:
      context: .
      dockerfile: ./DockerfilePostgresql
    ports:
      - "\${POSTGRES_PORT}:5432"
    environment:
      PGDATA: /var/lib/postgresql/data/data1/
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
  redis-cache-test:
    # image: "redis/redis-stack"
    build:
      context: .
      dockerfile: ./DockerfileRedis
    ports:
      - "\${REDIS_PORT}:6379"
  memcached-cache-test:
    image: "memcached"
    ports:
      - "\${MEMCACHED_PORT}:11211"

`;

export let DOCKERFILE_REDIS = `

# syntax=docker/dockerfile:1
FROM redis/redis-stack
RUN cat /opt/redis-stack/etc/redis-stack.conf > /redis-stack.conf
RUN echo "\nmaxmemory 31000000\n" >> /redis-stack.conf
RUN echo "maxmemory-policy allkeys-lru\n" >> /redis-stack.conf
ENTRYPOINT [ "/entrypoint.sh", "/opt/redis-stack/etc/redis-stack.conf" ]


`;

export let CACHE_WORKER_CODE = `
def cache_worker(self, threadNumber):
  # child class specific
  cache_conn = self.create_connection()
  while True:
    key, count, queue_empty = self.next_queue_value()
    
    if queue_empty:
        break

    if key is None:
        continue

    self.process_key(cache_conn, key, count, threadNumber)
`;

export let POSTGRES_SMT = `
# uncomment to control cache size
stmt = "SELECT cron.schedule('cache-delete-old', '*/1 * * * *', 'DELETE FROM cache WHERE inserted_at < NOW() - ''300 seconds''::interval;');"
`;


export let POSTGRES_PROCESS_KEY = `
def process_key(self, Session, key, count, threadNumber):
  stime = time.time()
  session = Session()
  session.begin()
  try:
      cacheRes = self.postres_cache_get(key, session)
      if cacheRes:
          self.log_cache(threadNumber, count, stime,
                          cacheRes.key, cacheRes.value, True, False)
      else:
          # there is a case when no key
          value = fetch_data_auto(self.SourceTable, key, None, session)
          if value is None:
              raise Exception("Excepting existing key!")
          
          cache = CacheTable(
              key=key, value=value)
          session.add(cache)
          session.commit()
          self.log_cache(threadNumber, count, stime,
                          key, value, False, False)
      
  except IntegrityError as error:
      # Either a key was written to the cache right before writing here or a different issue occured that needs a rollback. So just rollback and put value back on the queue. In this application only performance is being tested so ignoring the error will suffice

      # or the key could be thrown back on the queue
      self.keyQueue.put((key, count))

      session.rollback()
      print(error)
  except Exception as ex:
      session.rollback()
      print(ex)
      traceback.print_exc()

  session.close()
`;

export let APP_FILES_LS = `
ls -1 cache_test_app/
README.md
app
container_config
logs
requirements.txt
scripts
`;
