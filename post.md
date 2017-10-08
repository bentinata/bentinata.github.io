---
---
{% assign posts = site.post | sort: "date" %}
{% for post in posts %}
  [{{ post.title }} ({{ post.date | date_to_string }})]({{ post.url }})
{% endfor %}
