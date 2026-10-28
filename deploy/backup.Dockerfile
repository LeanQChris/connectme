FROM postgres:16-alpine
RUN apk add --no-cache restic redis
COPY deploy/backup.sh /usr/local/bin/connectme-backup
RUN chmod 755 /usr/local/bin/connectme-backup
ENTRYPOINT ["connectme-backup"]
CMD ["loop"]
