import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import useWizardStore from '../../store/wizardStore';
import { useToastStore } from '../../store/toastStore';
import styles from './PostSwitcher.module.css';

export default function PostSwitcher() {
  const { posts, activePost, setActivePost, createNewPost, isLoading } = useWizardStore();
  const addToast = useToastStore((state) => state.addToast);

  const handleAddPost = async () => {
    try {
      await createNewPost();
      const createdPost = useWizardStore.getState().activePost;
      if (createdPost) addToast(`Post ${createdPost.post_number} created`, 'success');
    } catch (err) {
      console.error('Failed to create a post:', err);
      addToast('Could not create a post. Please try again.', 'error');
    }
  };

  const handlePostChange = async (postId: string) => {
    try {
      await setActivePost(postId);
    } catch {
      addToast('Could not load that post. Please try again.', 'error');
    }
  };

  return (
    <Box className={styles.container}>
      <Box>
        <Typography className={styles.eyebrow}>PROJECT POSTS</Typography>
        <Typography variant="body2" color="text.secondary">
          Shared category and Viral DNA · each post has its own content and image
        </Typography>
      </Box>
      <Box className={styles.actions}>
        <FormControl size="small" className={styles.select}>
          <InputLabel id="active-post-label">Active post</InputLabel>
          <Select
            labelId="active-post-label"
            label="Active post"
            value={activePost?.id ?? ''}
            disabled={isLoading || posts.length === 0}
            onChange={(event) => { void handlePostChange(event.target.value); }}
          >
            {posts.map((post) => (
              <MenuItem key={post.id} value={post.id}>
                Post {post.post_number} · {post.status.replace('_', ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { void handleAddPost(); }}
          disabled={isLoading}
        >
          New post
        </Button>
      </Box>
    </Box>
  );
}
