---
date: 2017-10-07
edit: 2017-10-09
---
For a _part_ time web developer (like me), an multi-purpose tool is valuable.
Kinda like Swiss army knife. Doesn't need to be perfect, just good enough.
I'm using nginx, and I want it to be able to:
- Do flexible routing
- Serve indexed directory content in html
- Serve JSON representation of directory content

# Flexible routing

This is pretty easy.

```nginx
server {
  root /path/to/site;
  try_files $uri $uri.html $uri/ =404;
}
```

To remind you back some of the nginx default settings:
- listen to any host at port 80
- serve file named index.html if requested path is folder
- logs nowhere if you haven't create logs dir

This is a development environment, it's ok to rely on default values.

Suppose, I have a dir structure of:

```
|-  index.html
|-  pages.html
|-  style.css
|-  post/
|   |-  nginx.html
|   |-  oct.html
| 
|-  talk/
    |-  index.html
    |-  image.png
```

request|returned file
-|-
`/`|index.html
`/pages`|pages.html
`/style.css`|style.css
`/post`|403
`/post/nginx`|post/nginx.html
`/talk`|talk/index.html
`/talk/image.png`|talk/image.png

`try_files` order do matter!
If there's a file named talk.html on the root dir;
that would get served first instead of talk/index.html.
So, if there's a need to request the latter file,
it should referenced by using full path: `/talk/index.html`
Should've fix the greater problem, though:
> Why there's two conflicting file path?

Also, the `/post` endpoint would return 403.
Which isn't quite right; should've been 404.
But we know there's nothing in `/post` anyway. :)

# Serve indexed content

This is also trivial. Just add `autoindex on` line;
Or, you could use module [fancyindex](https://github.com/aperezdc/ngx-fancyindex#directives)!

Now, the then-erred `/post` endpoint would serve post/ content instead! Neato.
But, then another problem arrive.
> What if I want to serve directory content index with `index.html` present?

We could use **virtual host**!

```nginx
server {
  listen 127.0.0.1;
  server_name index;
  root $http_root;
  default_type application/html;
  index null;
  autoindex on;
}

server {
  root /path/to/site;
  try_files $uri $uri.html $uri/ =404;
  autoindex on;

  location ~ (?<path>.*?)\/?\.index {
    try_files $uri @index;
  }

  location @index {
    proxy_set_header Root $document_root;
    proxy_set_header Host "index";
    proxy_pass http://127.0.0.1$path/;
  }
}
```

Now directory index is accessible by using it's path appended by ".index".
For example, `/post.index` or `/post/.index`.
Both of two endpoint above would resolve to the same thing.

## What happens here?

First we match any url ends with ".index", and put it into $path variable.
If you happen to use more than one location block, put regex block before other.
Commonly used block is `location /` block, put regex block before.
Regex block would just ignored if there's any other matching location.
Even if that block wouldn't resolve to anything.

Afterwards we put `try_files` inside regex block,
ensuring it would resolve to any existing file before reference to index block.

Then, we have another block, but this is named block.
This kind of block wouldn't resolve any path, must be referenced.
Inside this block, we proxy passing to index vhost, which is already defined.
We're still passing request to 127.0.0.1 (or localhost), but nginx
differentiate server by server_name. This is our index virtual host.
(Might be called by other name though.)
We also add "Root" header.

Finally, index virtual host would return autoindexed path.
nginx will take any header in form of variable named `$http_[variable]`;
with `[variable]` being normalized http header.
Define `index null`, so any index.html file (which is default value) is ignored.
Only listen to 127.0.0.1, so people don't tamper with request.
If listen left to default value, anyone in the network could just send request
to index virtual host, and possible with header `Root: /`.
Giving read access to whole filesystem that's readable by nginx user process.
You could remove it if [you don't know anybody like that](https://xkcd.com/908) in your network though.

Now, directory index could be accessible at three different endpoint:
- `/post/` (if there's no index.html file)
- `/post.index`
- `/post/.index`

Dotfiles in url is a bit uncommon though.

If somehow:
- A file named index.html inside post/ directory exist
- A file named .index inside post/ directory also exist
- A file named post.index in the root directory exist

Then you're out of luck.
(Why would anyone do that though?)

# Serve JSON

Now that we understand virtual host. We could make another one!
```nginx
server {
  listen 127.0.0.1;
  server_name json;
  root $http_root;
  default_type application/json;
  index null;
  autoindex on;
  autoindex_format json;
}
```

Now using `autoindex_format json`, pretty self-explaining.
From our main server block, just create another named location block.
Then proxy pass to this virtual host.
```nginx
location ~ (?<path>.*?)\/?\.json {
  try_files $uri @json;
}

location @json {
  proxy_set_header Root $document_root;
  proxy_set_header Host "json";
  proxy_pass http://127.0.0.1$path/;
}
```

Basically the same block, with "index" replaced with "json", `s/index/json`.
Or! You could modify existing named and regex location block.
Capture the "extension" to another variable, and pass it to the "Host" header.
Thankfully, our knife is configurable.
```nginx
location ~ (?<path>.*?)\/?\.(?<type>index|json) {
  try_files $uri @index;
}

location @index {
  proxy_set_header Root $document_root;
  proxy_set_header Host $type;
  proxy_pass http://127.0.0.1$path/;
}
```

Now our json is available at either `/post.json` or `/post/.json`.
```json
[
  {
    "name":"nginx.html",
    "type":"file",
    "mtime":"Sun, 08 Oct 2017 17:53:18 GMT",
    "size":5639
  },
  {
    "name": "oct.html",
    "type":"file",
    "mtime":"Fri, 06 Oct 2017 10:56:56 GMT",
    "size":1218
  },
]
```

[I use slightly different config than this.](/nginx)

Neat! If you ever need something more specialized than this,
consider modify nginx source code, or create nginx module.
Or just create your own web server, using Go or such.
