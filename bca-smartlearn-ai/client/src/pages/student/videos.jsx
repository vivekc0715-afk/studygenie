import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Clock3,
  ExternalLink,
  Filter,
  Play,
  RefreshCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  Youtube,
} from 'lucide-react';
import { videoService } from '../../services/videos.service';
import { qk } from '../../lib/queryClient';
import { toastError, notifySuccess } from '../../lib/notify';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useListParams } from '../../hooks/use-list-params';
import { PageHeader } from '../../components/common/page-header';
import { SearchInput } from '../../components/common/search-input';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Pagination } from '../../components/ui/pagination';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState, ErrorState } from '../../components/ui/empty-state';
import { cn, humaniseKey } from '../../lib/utils';

const DIFFICULTY_VARIANT = {
  easy: 'mint',
  medium: 'butter',
  hard: 'peach',
};

const STATUS_VARIANT = {
  pending: 'neutral',
  saved: 'sky',
  watching: 'butter',
  watched: 'mint',
  dismissed: 'blush',
};

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function VideoCard({ video, onStatusChange, showSubject = false }) {
  const youtubeId = video.youtubeId || video.video?.youtubeId;
  const title = video.title || video.video?.title;
  const channelTitle = video.channelTitle || video.video?.channelTitle;
  const durationSeconds = video.durationSeconds || video.video?.durationSeconds || 0;
  const duration = video.duration || formatDuration(durationSeconds);
  const thumb = video.thumbnailUrl || video.video?.thumbnailUrl || `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
  const difficulty = video.difficulty || video.video?.difficulty;

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      <a
        href={`https://youtube.com/watch?v=${youtubeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-video overflow-hidden bg-canvas-deep"
      >
        <img src={thumb} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="size-10 text-white fill-white" />
        </div>
        {duration && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] text-white tabular-nums">
            {duration}
          </span>
        )}
        {difficulty && (
          <span className={cn('absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10.5px] font-semibold capitalize',
            difficulty === 'easy' ? 'bg-mint/90 text-mint-ink' :
            difficulty === 'hard' ? 'bg-peach/90 text-peach-ink' : 'bg-butter/90 text-butter-ink'
          )}>
            {difficulty}
          </span>
        )}
      </a>
      <CardContent className="p-3 space-y-2">
        <p className="text-[13px] font-semibold text-ink line-clamp-2 leading-snug">{title}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] text-ink-muted truncate flex items-center gap-1">
            <Youtube className="size-3 text-red-500 shrink-0" />
            {channelTitle}
          </span>
          {video.status && (
            <Badge variant={STATUS_VARIANT[video.status] || 'neutral'} size="sm">
              {humaniseKey(video.status)}
            </Badge>
          )}
        </div>
        {showSubject && (video.subjectName || video.subject?.name) && (
          <p className="text-[11px] text-ink-faint">
            <BookOpen className="inline size-3 mr-1" />
            {video.subjectName || video.subject?.name}
            {video.semesterNumber ? ` · Sem ${video.semesterNumber}` : ''}
          </p>
        )}
        {onStatusChange && (
          <div className="flex gap-1.5 pt-1">
            <Button size="sm" variant="subtle" className="flex-1 text-[11.5px]" onClick={() => onStatusChange(video.id, 'watched')}>
              <ThumbsUp className="size-3.5" /> Watched
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-[11.5px]" onClick={() => onStatusChange(video.id, 'dismissed')}>
              <ThumbsDown className="size-3.5" /> Skip
            </Button>
          </div>
        )}
        <a
          href={`https://youtube.com/watch?v=${youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11.5px] text-brand hover:underline"
        >
          <ExternalLink className="size-3" /> Watch on YouTube
        </a>
      </CardContent>
    </Card>
  );
}

const SEM_OPTIONS = ['All', '1', '2', '3', '4', '5', '6'];

export default function Videos() {
  useDocumentTitle('Video Lessons');
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const topicId = searchParams.get('topicId');

  const { params, setSearch, setPage } = useListParams({ page: 1, limit: 12 });
  const [tab, setTab] = useState('syllabus');
  const [semFilter, setSemFilter] = useState('All');
  const [chapSearch, setChapSearch] = useState('');

  const syllabusQuery = useQuery({
    queryKey: ['videos', 'syllabus', semFilter, chapSearch],
    queryFn: () => videoService.syllabusChapters({
      semester: semFilter !== 'All' ? semFilter : undefined,
      search: chapSearch || undefined,
    }),
    enabled: tab === 'syllabus',
  });

  const recsQuery = useQuery({
    queryKey: qk.videoRecommendations,
    queryFn: () => videoService.recommendations(),
    enabled: tab === 'recommendations',
  });

  const curatedQuery = useQuery({
    queryKey: qk.videoCurated(params),
    queryFn: () => videoService.curated(params),
    enabled: tab === 'curated',
  });

  const topicQuery = useQuery({
    queryKey: qk.videoTopic(topicId),
    queryFn: () => videoService.forTopic(topicId),
    enabled: !!topicId && tab === 'topic',
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => videoService.updateStatus(id, status),
    onSuccess: () => {
      notifySuccess('Video status updated');
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
    onError: (e) => toastError(e, 'Could not update video.'),
  });

  const refreshMutation = useMutation({
    mutationFn: () => videoService.refresh(),
    onSuccess: () => {
      notifySuccess('Recommendations refreshed!');
      queryClient.invalidateQueries({ queryKey: qk.videoRecommendations });
    },
    onError: (e) => toastError(e, 'Could not refresh.'),
  });

  // Resolve recommendations list – shape varies between DB and syllabus fallback
  const recsRaw = recsQuery.data?.recommendations || recsQuery.data || [];
  const recs = recsRaw
    .filter((v) => (v.status !== 'dismissed'))
    .map((v) => ({
      ...v,
      youtubeId: v.youtubeId || v.video?.youtubeId,
      title: v.title || v.video?.title,
      channelTitle: v.channelTitle || v.video?.channelTitle,
      thumbnailUrl: v.thumbnailUrl || v.video?.thumbnailUrl,
      durationSeconds: v.durationSeconds || v.video?.durationSeconds,
      difficulty: v.difficulty || v.video?.difficulty,
    }));

  const { data: curated = [], pagination } = curatedQuery.data || {};
  const topicVideos = topicQuery.data || [];
  const syllabusChapters = Array.isArray(syllabusQuery.data) ? syllabusQuery.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Youtube}
        title="Video Lessons"
        description="Watch curated BCA syllabus chapters and YouTube lessons for every subject."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="syllabus">📚 Syllabus Chapters</TabsTrigger>
            {topicId && <TabsTrigger value="topic">Topic Videos</TabsTrigger>}
            <TabsTrigger value="recommendations">For You</TabsTrigger>
            <TabsTrigger value="curated">All Videos</TabsTrigger>
          </TabsList>

          {tab === 'recommendations' && (
            <Button variant="outline" size="sm" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
              <RefreshCw className={cn('size-4', refreshMutation.isPending && 'animate-spin')} />
              Refresh
            </Button>
          )}
          {tab === 'curated' && (
            <SearchInput
              value={params.search || ''}
              onChange={setSearch}
              placeholder="Search videos…"
              className="w-56"
            />
          )}
        </div>

        {/* Syllabus Chapters */}
        <TabsContent value="syllabus" className="mt-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex gap-1 flex-wrap">
              {SEM_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSemFilter(s)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors border',
                    semFilter === s
                      ? 'bg-brand text-white border-brand'
                      : 'border-line text-ink-muted hover:bg-canvas-deep'
                  )}
                >
                  {s === 'All' ? 'All Semesters' : `Sem ${s}`}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <SearchInput
                value={chapSearch}
                onChange={setChapSearch}
                placeholder="Search chapters…"
                className="w-48"
              />
            </div>
          </div>

          {syllabusQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : syllabusQuery.isError ? (
            <ErrorState error={syllabusQuery.error} onRetry={syllabusQuery.refetch} />
          ) : syllabusChapters.length === 0 ? (
            <EmptyState preset="search" title="No chapters found" description="Try a different semester or search term." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {syllabusChapters.map((v) => (
                <VideoCard key={v.id || v.youtubeId} video={v} showSubject />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="mt-5">
          {recsQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : recsQuery.isError ? (
            <ErrorState error={recsQuery.error} onRetry={recsQuery.refetch} />
          ) : recs.length === 0 ? (
            <EmptyState
              preset="empty"
              title="No recommendations yet"
              description="Attempt a test so we can detect weak topics and suggest relevant videos."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recs.map((v, i) => (
                <VideoCard
                  key={v.id || v._id || i}
                  video={v}
                  onStatusChange={v._id ? (id, status) => statusMutation.mutate({ id, status }) : undefined}
                  showSubject
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Curated library */}
        <TabsContent value="curated" className="mt-5">
          {curatedQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : curatedQuery.isError ? (
            <ErrorState error={curatedQuery.error} onRetry={curatedQuery.refetch} />
          ) : curated.length === 0 ? (
            <EmptyState preset="empty" title="No videos found" description="Try a different search term." />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {curated.map((v) => <VideoCard key={v.id || v._id} video={v} showSubject />)}
              </div>
              {pagination && (
                <div className="mt-4">
                  <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Topic videos */}
        {topicId && (
          <TabsContent value="topic" className="mt-5">
            {topicQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
              </div>
            ) : topicQuery.isError ? (
              <ErrorState error={topicQuery.error} onRetry={topicQuery.refetch} />
            ) : topicVideos.length === 0 ? (
              <EmptyState preset="empty" title="No videos for this topic" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {topicVideos.map((v) => <VideoCard key={v.id || v._id} video={v} />)}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
