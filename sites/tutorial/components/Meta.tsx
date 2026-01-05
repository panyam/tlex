import Head from 'next/head';

const Meta = (props: any) => {
  return (
    <Head>
      <title>{props.title}</title>
      <meta
        name='keywords'
        content='react native, blog, John Doe, tutorial, react navigation'
      />
    </Head>
  );
};

export default Meta;

// let's set a default title
Meta.defaultProps = {
  title: 'PressBlog - Your one stop blog for everything React Native',
};
