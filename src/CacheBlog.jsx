import { useEffect } from 'react';
import { Link } from "react-router-dom";

import statTable1 from './assets/Table1.1.png'
import statTable2 from './assets/Table2.1.png'
import statTable3 from './assets/Table3.png'
import statTable4 from './assets/Table4.png'
import errorImage from './assets/trace_error.png'
import Prism from "prismjs";

import { PROCESS_KEY_CODE, DOCKER_COMPOSE_CODE, CACHE_WORKER_CODE, APP_FILES_LS, DOCKERFILE_REDIS, POSTGRES_SMT, POSTGRES_PROCESS_KEY } from './constants';

const repoString = "https://github.com/paulcb/cache_test_app/blob/main"

const CacheBlog = () => {
    useEffect(() => {
        Prism.highlightAll();
    }, []);


    return (
        <>
            <div className="card">
                <div className="cardDate">4/2/2025</div>
                <div style={{ display: 'inline' }}>
                    <b>I Dunno Here's Some Cache Stuff</b>
                    &nbsp;--&nbsp;
                    <a className="carda" href={repoString}>
                        code
                    </a>

                </div>

                <br /><br />
                Caching software like Redis and Memcached are gotos for speeding up requests between client and server. Lately, there have been examples showing PostgreSQL’s ability to cache data which might already exist in a platform's infrastructure <a href="https://martinheinz.dev/blog/105">[1]</a>. Using already existing infrastructure is a tempting way to get performance gains. This post looks at PostgreSQL’s cache mechanism and compares to existing caching software.
                <br /><br />

                Building this understanding of cache infrastructure and performace, my overall goal is to plan for user usage and ranking statistics in <Link to="/amazething"><b>aMazeThing - An AWS Cloud Game</b></Link> for user to interact with. Then with AWS Fargate or Aurora PostgreSQL, get one of these methods going serverless to gather daily or weekly data and store long term in AWS S3. This post focuses on single instances so a later post or edit could look into replicas and scaling these services.

                <br /><br />

                Caching stats included are runtimes and mean response times, etc. for cache hits and misses for four caching methods, Redis, Memcached, PostgreSQL Unlogged Table, and Python Cache. Docker single container instances are connect to with a Python multithreading app to simulate concurrent requests. For realistic testing, trace files from “ARC: A SELF-TUNING, LOW OVERHEAD REPLACEMENT CACHE” (ARC paper) are used in testing [2] [3]. Also, a few randomized trace files were tested against.

                <br /><br />

                Python Cache is custom runtime LRU cache used to see raw runtime performace without a service in the way. In comments, regarding performace it is ignored for stating what might be best and used as a control as part of these experiments.<br />

                <a href={repoString + "/app/python_cache.py"}>cache_test_app/app/python_cache.py</a>

                <br /><br />

                These tests model a hopefully familiar cache design: database requests are retrieved to fill a cache for later requests. Moreover, a request specifies some identifier from the database. If the identifier didn’t already exist in that case, it’s retrieved from the data store and set in the cache. Since this post is just looking into response times, a smaller static message size of 16 bytes (maybe website session tokens) in tests to not incure long runtimes. In the ARC paper, trace file values depend on the second column for the number of blocks all 512 bytes in size.

                <br /><br />

                <br /><br /><b>Laying out performace</b>
                <br /><br />

                In the Table 1 below, ignoring the custom Python Cache control, Redis is overall probably the best choice since it offers best read and write latency. Redis does line up with it in test3. PostgreSQL is what one would expect, an OK choice. Memcached shows significant write latency as more keys are added in test2 and test3. It was taken out of later tests because I got tired of it taking so long to run. These initial tests are just randomly generated test data.

                <br /><br />
                Table 1 - Cache value sizes all 16 bytes - 2 Threads
                <img src={statTable2} alt="logo" />

                <br /><br />

                Something to think about: better performance is achieved on reads in PostgreSQL if a standard database table is used to request keys from shown as "PostgreSQL No Cache" in Table 2. There is a performance gained to using UNLOGGED tables. Table 2, shows no cache table reads and a cache table with unlogged tag removed.

                <br /><br />

                Some theory: using a PostgreSQL Cache will have benefits on writes [2] and storing unstructured data from more complex queries. Larger databases and doing JOINs, PARTIONs, and or GROUP BY queries could benefit from a cache storing latter mentioned unstructured data in perhaps a JSONB attribute. This post is looking general response time and comparing to other caching methods. Perhaps a more complex usage could be included and analyzed in a later post or edit. More complexities would be introduced such as ejecting cache entries on main table updates hence randomized writes.

                <br /><br />

                Another performance consideration: using a single thread helps performance on all cache types because of queuing (I think) within the services which operate on data sequentily. So two threads are used in all tests to simulate a more realistic environment. Pretty sure the queuing isn't a result of Python GIL but the various connection instances of the threads (I think).

                <br /><br />

                Table 2 - Things to consider
                <img src={statTable4} alt="logo" />

                <br /><br />

                Let's take a look at some of the ARC paper's trace data in the Table 3.<br />

                With realistic traces, performance is similar with the Python Cache performing best since it's a runtime cache in the test suite to show raw performance without a connection in the way. Memcached was left out of these tests given significant write latency.

                <br /><br />

                Table 3 - Cache value 16 bytes times number of blocks in trace file - 2 Threads
                <img src={statTable1} alt="logo" />

                <br /><br />

                <br /><br /><b>Enabling Cache Policies </b>
                <br /><br />
                So far though, all these tests were given max memory for the cache types. Let's enable LRU for Redis and Python Cache and give PostgreSQL Cache a cron job to eject old entries in Table 4.

                <br /><br />


                Redis Dockerfile to set LRU policy<br />
                <a href={repoString + "/container_config/DockerfileRedis"}>cache_test_app/container_config/DockerfileRedis</a>
                <pre>
                    <code className="language-text" style={{ fontSize: '13px' }}>
                        {DOCKERFILE_REDIS}
                    </code>
                </pre>

                <br /><br />

                PostgreSQL statment to set pg_cron "cache" policy prior to starting a test

                <br />

                <a href={repoString + "/app/postgres_cache.py"}>cache_test_app/app/postgres_cache.py</a>
                <pre>
                    <code className="language-python" style={{ fontSize: '13px' }}>
                        {POSTGRES_SMT}
                    </code>
                </pre>

                <br /><br />
                Table 4 - LRU Redis and Python Cache, PostgreSQL pg_cron enabled (remove in cache if greater than 5 mins old) - 2 Threads

                <img src={statTable3} alt="logo" />

                <br />
                pg_cron setting was based of initial runtime of OLTP.lis of ~ 16 minutes for PostgreSQL Cache and ejecting 5 minutie of cache items. With about 1/3 the runtime in mind, the LRU cache sizes were made 1/3 size of number of keys. This works for OLTP.lis since the block sizes are all the same so with varying blocks an averaged approach would be beter. And in Table 4 the reduction in mean response and throughput show the effect of the cache size / pg_cron setting.
                <br />
                <br />
                Cache size for Redis and Python Cache based on 1/3 size of OLTP.lis key count (186,880) and 512 block value
                <br />
                <br />
                Cache size set from ((512 * 186880 / 1024 / 1024) / 3) = ~ 30 Mb

                <br /><br />

                When enabling the cache policies, a similuar performance to max memory is seen. This could be enough to say that no matter what policy is enabled in PosgreSQL with pg_cron, Redis is going to be the better choice for performance. Hang on though.

                <br /><br />

                To speak to Redis and PostgreSQL Cache using different caching policies, LRU vs. the pg_cron, an unlogged table could be given a last used attribute, but it would need a write during the each fetch which feels icky when actually trying to represent a cache. I’m pretty sure Redis and Memcache use a more clever approach and move a recently read identifier from its place in a doubly linked list to the front of it. This allows for constant time updating which the Python Cache does with llist library. With PostgreSQL there's isn't going to be a constant time update so at least for tests, so removing oldest caches entries is a start here. Let's explore in a later post or edit. No promises.

                <br /><br />
                <br /><br /><b>Here's an interesting issue that occurred with PostgreSQL</b>
                <br /><br />

                <img src={errorImage} alt="logo" />

                <br /><br />

                Using multithreaded requests, a missing key was attempting to write to the cache when another had already written at the same time. A handle full or more of these happen per test. In this case, since this is only for testing purposes :), the key is put back on the queue. Queuing is done by Python's queue library which is helpful when doing multithreaded processing since it has blocking and timeout features. The issue here must be common. There is no guarantee that a database unique attribute won't throw an integrity error unless some careful programing is done and all requests are sequential. Browsing through the trace files, it occurs on sequential initial key reads of the same id which makes sense. Two requests compete.

                <br /><br />

                <a href={repoString + "/app/postgres_cache.py"}>cache_test_app/app/postgres_cache.py</a>

                <pre>
                    <code className="language-python" style={{ fontSize: '13px' }}>
                        {POSTGRES_PROCESS_KEY}
                    </code>
                </pre>

                <br /><br />

                <br /><br />
                <br /><br /><b>More on infrastructure and code</b>
                <br /><br />

                Infrastructure containers were provisioned using Docker Compose for PostgreSQL with pg_cron, Redis, and Memcached. The container_config folder has the compose.yaml and Dockerfile settings. The PostgreSQL pg_cron Dockerfile and scripts were implemented referencing [3] which was super useful and one of the first posts I looked at regarding PostgreSQL caching. The repos README.md has more info on installing and running this if interested.


                <br /><br />

                <a href={repoString + "container_config/compose.yaml"}>cache_test_app/container_config/compose.yaml</a>

                <pre>
                    <code className="language-python" style={{ fontSize: '13px' }}>
                        {DOCKER_COMPOSE_CODE}
                    </code>
                </pre>

                <br /><br />

                PostgreSQL connecting and SQLAlchemy ORM libraries made commit sessions and database implementation using automapping and class tables.

                <br /><br />

                The various caches are organized into classes that rely on a base cache class that make use of Python wacky class inheritance. For example, Python method overrides aren’t verbose in any way but there is a library to help with that: abc.

                <br /><br />
                <pre>
                    <code className="language-bash" style={{ fontSize: '13px' }}>
                        {APP_FILES_LS}
                    </code>
                </pre>

                <a href={repoString + "app/cache.py"}>cache_test_app/app/cache.py</a>

                <pre>
                    <code className="language-python" style={{ fontSize: '13px' }}>
                        {CACHE_WORKER_CODE}
                    </code>
                </pre>

                <br /><br />

                <a href={repoString + "app/redis_cache.py"}>cache_test_app/app/redis_cache.py</a>

                <pre>
                    <code className="language-python" style={{ fontSize: '13px' }}>
                        {PROCESS_KEY_CODE}
                    </code>
                </pre>

                <br /><br />

                <br /><br />

                Lastly, the scripts folder contains the various scripts used to generate random trace file data and out an accompanying sql file which Docker postgres can load in its entry point location. The ARC paper trace files are here [3] and not included in the repo. There are some commented lines in places for configuring the ARC paper trace files if it peaks one's interest. A small random trace fill is in the repo to run the app out of the box.

                <br /><br />
                References:
                <br />
                1. https://martinheinz.dev/blog/105
                <br />
                2. https://www.usenix.org/legacy/event/fast03/tech/full_papers/megiddo/megiddo.pdf
                <br />
                3. https://github.com/moka-rs/cache-trace/tree/main/arc
                <br />
                <br /><br />
            </div>

        </>
    );
};

export default CacheBlog;
